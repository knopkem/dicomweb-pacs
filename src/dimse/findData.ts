import fs from 'fs/promises';
import path from 'path';
import dicomParser, { DataSet } from 'dicom-parser';
import { get_element } from '@iwharris/dicom-data-dictionary';
import { DicomJsonElement, DicomJsonRecord, QueryParams } from '../types';
import { ConfParams, config } from '../utils/config';
import { collectFiles, fileExists } from '../utils/fileHelper';
import { LoggerSingleton } from '../utils/logger';
import { QUERY_LEVEL } from './querLevel';
import { tagsForLevel } from './tags';

const controlQueryKeys = new Set(['includefield', 'offset', 'limit']);

type DicomJsonValue = NonNullable<DicomJsonElement['Value']>[number];

interface ParsedDicomFile {
  filePath: string;
  studyInstanceUid?: string;
  seriesInstanceUid?: string;
  sopInstanceUid?: string;
  values: Record<string, DicomJsonValue[]>;
}

interface QueryFilter {
  tag: string;
  vr: string;
  value: string;
}

function findDicomName(name: string): string | undefined {
  const dataElement = get_element(name);
  if (dataElement) {
    return dataElement.tag.replace(/[(),]/g, '');
  }
  return undefined;
}

function findVR(name: string): string {
  const dataElement = get_element(name);
  return dataElement ? dataElement.vr : '';
}

function getTagVr(tag: string): string {
  return findVR(tag) || 'UN';
}

function datasetTag(tag: string): string {
  return `x${tag.toLowerCase()}`;
}

function toDicomJsonElement(tag: string, values: DicomJsonValue[]): DicomJsonElement | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return {
    Value: values,
    vr: getTagVr(tag),
  };
}

function comparableValue(value: DicomJsonValue): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }
  if (
    value &&
    typeof value === 'object' &&
    'Alphabetic' in value &&
    typeof value.Alphabetic === 'string'
  ) {
    return value.Alphabetic;
  }
  return undefined;
}

function firstComparableValue(values: DicomJsonValue[] | undefined): string | undefined {
  if (!values) {
    return undefined;
  }
  return values.map(comparableValue).find((value): value is string => value !== undefined);
}

function valueCountForVr(dataset: DataSet, key: string, vr: string): number {
  const element = dataset.elements[key];
  if (!element) {
    return 0;
  }

  switch (vr) {
    case 'US':
    case 'SS':
      return Math.max(1, Math.floor(element.length / 2));
    case 'UL':
    case 'SL':
    case 'FL':
    case 'AT':
      return Math.max(1, Math.floor(element.length / 4));
    case 'FD':
      return Math.max(1, Math.floor(element.length / 8));
    default:
      return dataset.numStringValues(key) ?? 1;
  }
}

function extractValueByVr(dataset: DataSet, key: string, vr: string, index: number): DicomJsonValue | undefined {
  switch (vr) {
    case 'PN': {
      const value = dataset.string(key, index);
      return value ? { Alphabetic: value } : undefined;
    }
    case 'US':
      return dataset.uint16(key, index);
    case 'SS':
      return dataset.int16(key, index);
    case 'UL':
      return dataset.uint32(key, index);
    case 'SL':
      return dataset.int32(key, index);
    case 'FL':
      return dataset.float(key, index);
    case 'FD':
      return dataset.double(key, index);
    case 'DS':
      return dataset.floatString(key, index);
    case 'IS':
      return dataset.intString(key, index);
    case 'AT':
      return dataset.attributeTag(key);
    case 'LT':
    case 'ST':
    case 'UT':
      return dataset.text(key, index);
    default:
      return dataset.string(key, index) ?? dataset.text(key, index);
  }
}

function extractTagValues(dataset: DataSet, tag: string): DicomJsonValue[] {
  const key = datasetTag(tag);
  if (!dataset.elements[key]) {
    return [];
  }

  const vr = getTagVr(tag);
  const count = valueCountForVr(dataset, key, vr);
  const values: DicomJsonValue[] = [];
  for (let index = 0; index < count; index += 1) {
    const value = extractValueByVr(dataset, key, vr, index);

    if (value !== undefined && value !== '') {
      values.push(value);
    }
  }

  return values;
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function matchesFilter(values: DicomJsonValue[], filter: QueryFilter): boolean {
  const comparableValues = values
    .map(comparableValue)
    .filter((value): value is string => value !== undefined && value !== '');
  if (comparableValues.length === 0) {
    return false;
  }

  if (['PN', 'LO', 'LT', 'SH', 'ST'].includes(filter.vr)) {
    const regex = new RegExp(`^${escapeRegExp(filter.value).replace(/\\\*/g, '.*')}$`, 'i');
    return comparableValues.some((value) => regex.test(value));
  }

  return comparableValues.some((value) => value === filter.value);
}

function buildRecord(values: Record<string, DicomJsonValue[]>, tags: string[]): DicomJsonRecord {
  const record: DicomJsonRecord = {};
  for (const tag of tags) {
    const element = toDicomJsonElement(tag, values[tag] ?? []);
    if (element) {
      record[tag] = element;
    }
  }
  return record;
}

function withComputedCount(record: DicomJsonRecord, tag: string, count: number): DicomJsonRecord {
  return {
    ...record,
    [tag]: {
      Value: [count],
      vr: getTagVr(tag),
    },
  };
}

function normalizeFilters(query: QueryParams): { filters: QueryFilter[]; invalidInput: boolean } {
  const filters: QueryFilter[] = [];
  let invalidInput = false;
  const minCharsQido = config.get<number>(ConfParams.MIN_CHARS);

  for (const [propName, rawValue] of Object.entries(query)) {
    if (controlQueryKeys.has(propName) || typeof rawValue !== 'string' || rawValue.length === 0) {
      continue;
    }

    const tag = findDicomName(propName);
    if (!tag) {
      continue;
    }

    const vr = findVR(propName);
    let value = rawValue;
    if (['PN', 'LO', 'LT', 'SH', 'ST'].includes(vr)) {
      value = value.replace(/^[*]/, '').replace(/[*]$/, '');
      if (minCharsQido > value.length) {
        invalidInput = true;
      }
      if (config.get<boolean>(ConfParams.APPEND_WILDCARD)) {
        value += '*';
      }
    }

    filters.push({ tag, vr, value });
  }

  return { filters, invalidInput };
}

async function parseDicomFile(filePath: string, requestedTags: string[]): Promise<ParsedDicomFile | undefined> {
  const data = await fs.readFile(filePath);
  const dataset = dicomParser.parseDicom(data);
  const tags = new Set([...requestedTags, '0020000D', '0020000E', '00080018']);
  const values: Record<string, DicomJsonValue[]> = {};

  for (const tag of tags) {
    const tagValues = extractTagValues(dataset, tag);
    if (tagValues.length > 0) {
      values[tag] = tagValues;
    }
  }

  return {
    filePath,
    studyInstanceUid: firstComparableValue(values['0020000D']),
    seriesInstanceUid: firstComparableValue(values['0020000E']),
    sopInstanceUid: firstComparableValue(values['00080018']),
    values,
  };
}

function isStoredInstanceFile(storagePath: string, filePath: string): boolean {
  const relativePath = path.relative(storagePath, filePath);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return false;
  }

  // Stored instances live at <storage>/<StudyInstanceUID>/<SOPInstanceUID>.
  return relativePath.split(path.sep).filter(Boolean).length === 2;
}

async function loadStoredFiles(requestedTags: string[]): Promise<ParsedDicomFile[]> {
  const logger = LoggerSingleton.Instance;
  const storagePath = config.get<string>(ConfParams.STORAGE_PATH);
  if (!(await fileExists(storagePath))) {
    return [];
  }

  const filePaths = (await collectFiles(storagePath)).filter((filePath) =>
    isStoredInstanceFile(storagePath, filePath),
  );
  const parsedFiles = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        return await parseDicomFile(filePath, requestedTags);
      } catch (error) {
        logger.warn('skipping unreadable DICOM file', filePath, error);
        return undefined;
      }
    }),
  );

  return parsedFiles.filter((file): file is ParsedDicomFile => Boolean(file?.studyInstanceUid));
}

export async function doFind(
  level: QUERY_LEVEL,
  query: QueryParams,
  defaultTags: string[] = tagsForLevel(level),
): Promise<DicomJsonRecord[]> {
  const includes = query.includefield;
  const tags = includes ? includes.split(',') : [];
  tags.push(...defaultTags);

  const requestedTags = Array.from(
    new Set(
      tags
        .map((tag) => findDicomName(tag) ?? tag)
        .filter((tag) => Boolean(tag)),
    ),
  );
  const { filters, invalidInput } = normalizeFilters(query);
  if (invalidInput) {
    return [];
  }

  const files = await loadStoredFiles(requestedTags.concat(filters.map((filter) => filter.tag)));
  const matchingFiles = files.filter((file) =>
    filters.every((filter) => matchesFilter(file.values[filter.tag] ?? [], filter)),
  );

  let records: DicomJsonRecord[] = [];
  if (level === QUERY_LEVEL.IMAGE) {
    records = matchingFiles
      .sort((left, right) => (left.sopInstanceUid ?? '').localeCompare(right.sopInstanceUid ?? ''))
      .map((file) => buildRecord(file.values, requestedTags));
  } else if (level === QUERY_LEVEL.SERIES) {
    const grouped = new Map<string, ParsedDicomFile[]>();
    for (const file of matchingFiles) {
      const seriesKey = `${file.studyInstanceUid ?? ''}:${file.seriesInstanceUid ?? ''}`;
      const group = grouped.get(seriesKey) ?? [];
      group.push(file);
      grouped.set(seriesKey, group);
    }

    records = Array.from(grouped.values())
      .sort(
        (left, right) =>
          `${left[0]?.studyInstanceUid ?? ''}:${left[0]?.seriesInstanceUid ?? ''}`.localeCompare(
            `${right[0]?.studyInstanceUid ?? ''}:${right[0]?.seriesInstanceUid ?? ''}`,
          ),
      )
      .map((group) => {
        let record = buildRecord(group[0].values, requestedTags);
        if (requestedTags.includes('00201209')) {
          record = withComputedCount(record, '00201209', group.length);
        }
        return record;
      });
  } else {
    const grouped = new Map<string, ParsedDicomFile[]>();
    for (const file of matchingFiles) {
      const group = grouped.get(file.studyInstanceUid ?? '') ?? [];
      group.push(file);
      grouped.set(file.studyInstanceUid ?? '', group);
    }

    records = Array.from(grouped.values())
      .sort((left, right) => (left[0]?.studyInstanceUid ?? '').localeCompare(right[0]?.studyInstanceUid ?? ''))
      .map((group) => {
        let record = buildRecord(group[0].values, requestedTags);
        if (requestedTags.includes('00201206')) {
          const seriesCount = new Set(group.map((file) => file.seriesInstanceUid).filter(Boolean)).size;
          record = withComputedCount(record, '00201206', seriesCount);
        }
        if (requestedTags.includes('00201208')) {
          record = withComputedCount(record, '00201208', group.length);
        }
        return record;
      });
  }

  const parsedOffset = Number.parseInt(query.offset ?? '0', 10);
  const offset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;
  const parsedLimit = Number.parseInt(query.limit ?? '', 10);
  const limit = Number.isNaN(parsedLimit) ? undefined : parsedLimit;
  return limit !== undefined ? records.slice(offset, offset + limit) : records.slice(offset);
}
