import fs from 'fs/promises';
import dicomParser, { DataSet } from 'dicom-parser';
import { get_element } from '@iwharris/dicom-data-dictionary';
import { DicomJsonElement, DicomJsonRecord, QueryParams } from '../types';
import { ConfParams, config } from '../utils/config';
import { collectFiles, fileExists } from '../utils/fileHelper';
import { LoggerSingleton } from '../utils/logger';
import { QUERY_LEVEL } from './querLevel';
import { tagsForLevel } from './tags';

const controlQueryKeys = new Set(['includefield', 'offset', 'limit']);

interface ParsedDicomFile {
  filePath: string;
  studyInstanceUid?: string;
  seriesInstanceUid?: string;
  sopInstanceUid?: string;
  values: Record<string, string[]>;
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

function toDicomJsonElement(tag: string, values: string[]): DicomJsonElement | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return {
    Value: values,
    vr: getTagVr(tag),
  };
}

function extractTagValues(dataset: DataSet, tag: string): string[] {
  const key = datasetTag(tag);
  if (!dataset.elements[key]) {
    return [];
  }

  const count = dataset.numStringValues(key) ?? 1;
  const values: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const value =
      dataset.string(key, index) ??
      dataset.text(key, index) ??
      dataset.floatString(key, index)?.toString() ??
      dataset.intString(key, index)?.toString() ??
      dataset.uint16(key, index)?.toString() ??
      dataset.int16(key, index)?.toString() ??
      dataset.uint32(key, index)?.toString() ??
      dataset.int32(key, index)?.toString() ??
      dataset.float(key, index)?.toString() ??
      dataset.double(key, index)?.toString();

    if (value !== undefined && value !== '') {
      values.push(value);
    }
  }

  return values;
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function matchesFilter(values: string[], filter: QueryFilter): boolean {
  if (values.length === 0) {
    return false;
  }

  if (['PN', 'LO', 'LT', 'SH', 'ST'].includes(filter.vr)) {
    const regex = new RegExp(`^${escapeRegExp(filter.value).replace(/\\\*/g, '.*')}$`, 'i');
    return values.some((value) => regex.test(value));
  }

  return values.some((value) => value === filter.value);
}

function buildRecord(values: Record<string, string[]>, tags: string[]): DicomJsonRecord {
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
      Value: [count.toString()],
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
  const values: Record<string, string[]> = {};

  for (const tag of tags) {
    const tagValues = extractTagValues(dataset, tag);
    if (tagValues.length > 0) {
      values[tag] = tagValues;
    }
  }

  return {
    filePath,
    studyInstanceUid: values['0020000D']?.[0],
    seriesInstanceUid: values['0020000E']?.[0],
    sopInstanceUid: values['00080018']?.[0],
    values,
  };
}

async function loadStoredFiles(requestedTags: string[]): Promise<ParsedDicomFile[]> {
  const logger = LoggerSingleton.Instance;
  const storagePath = config.get<string>(ConfParams.STORAGE_PATH);
  if (!(await fileExists(storagePath))) {
    return [];
  }

  const filePaths = await collectFiles(storagePath);
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
