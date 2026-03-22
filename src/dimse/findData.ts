import { get_element } from '@iwharris/dicom-data-dictionary';
import { findScu, findScuOptions, Node as DicomNode } from 'dicom-dimse-native';
import { DicomJsonElement, DicomJsonRecord, DicomResponse, QueryParams } from '../types';
import { ConfParams, config } from '../utils/config';
import { LoggerSingleton } from '../utils/logger';
import { queryLevelToString, QUERY_LEVEL } from './querLevel';
import { tagsForLevel } from './tags';

const controlQueryKeys = new Set(['includefield', 'offset', 'limit']);
const stringVrTypes = new Set(['PN', 'LO', 'LT', 'SH', 'ST']);
const utf8NormalizationTag = '00080005';

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

function trimElement(element: DicomJsonElement): DicomJsonElement | undefined {
  if (!Array.isArray(element.Value)) {
    return element;
  }

  const values = element.Value.filter((value) => value !== undefined && value !== '');
  if (values.length === 0) {
    return undefined;
  }

  return values.length === element.Value.length ? element : { ...element, Value: values };
}

function hasValue(element: DicomJsonElement | undefined): boolean {
  return Boolean(Array.isArray(element?.Value) && element.Value.length > 0);
}

function trimRecord(record: DicomJsonRecord, requestedTags: string[]): DicomJsonRecord {
  const trimmedRecord: DicomJsonRecord = {};
  for (const tag of requestedTags) {
    const element = record[tag];
    if (!element) {
      continue;
    }

    const trimmedElement = trimElement(element);
    if (trimmedElement) {
      trimmedRecord[tag] = trimmedElement;
    }
  }

  return trimmedRecord;
}

function getRequestedTags(query: QueryParams, defaultTags: string[]): string[] {
  const includes = query.includefield ? query.includefield.split(',') : [];
  return Array.from(
    new Set(
      [...includes, ...defaultTags]
        .map((tag) => findDicomName(tag) ?? tag)
        .filter((tag): tag is string => Boolean(tag)),
    ),
  );
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
    if (stringVrTypes.has(vr)) {
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

function selfNode(): DicomNode {
  return config.get<DicomNode>(ConfParams.SOURCE);
}

function buildFindOptions(
  level: QUERY_LEVEL,
  requestedTags: string[],
  filters: QueryFilter[],
): findScuOptions {
  const node = selfNode();
  const source = { ...node };
  const target = { ...node };
  const tags = new Map<string, string>();
  tags.set('00080052', queryLevelToString(level));
  for (const tag of requestedTags) {
    tags.set(tag, '');
  }
  tags.set(utf8NormalizationTag, '');

  for (const filter of filters) {
    tags.set(filter.tag, filter.value);
  }

  return {
    source,
    target,
    verbose: config.get<boolean>(ConfParams.VERBOSE),
    tags: Array.from(tags, ([key, value]) => ({ key, value })),
  };
}

function parseContainer(container: string | undefined): DicomJsonRecord[] {
  if (!container) {
    return [];
  }

  const parsed = JSON.parse(container);
  return Array.isArray(parsed) ? (parsed as DicomJsonRecord[]) : [];
}

async function runFind(
  level: QUERY_LEVEL,
  requestedTags: string[],
  filters: QueryFilter[],
): Promise<DicomJsonRecord[]> {
  const logger = LoggerSingleton.Instance;
  const options = buildFindOptions(level, requestedTags, filters);

  return new Promise((resolve) => {
    findScu(options, (result: string) => {
      if (!result) {
        logger.error('invalid result received');
        resolve([]);
        return;
      }

      try {
        const response = JSON.parse(result) as DicomResponse;
        if (response.code === 0) {
          const records = parseContainer(response.container);
          resolve(records.map((record) => trimRecord(record, requestedTags)));
          return;
        }

        if (response.code === 1) {
          logger.info('query is pending...');
          return;
        }

        logger.error(`c-find failure: ${response.message}`);
      } catch (error) {
        logger.error(error);
        logger.error(result);
      }

      resolve([]);
    });
  });
}

function firstStringValue(record: DicomJsonRecord, tag: string): string | undefined {
  const value = record[tag]?.Value?.[0];
  return typeof value === 'string' ? value : undefined;
}

function withCount(record: DicomJsonRecord, tag: string, count: number): DicomJsonRecord {
  return {
    ...record,
    [tag]: {
      Value: [count],
      vr: findVR(tag) || 'IS',
    },
  };
}

function countByStudy(records: DicomJsonRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const record of records) {
    const studyInstanceUid = firstStringValue(record, '0020000D');
    if (!studyInstanceUid) {
      continue;
    }

    counts.set(studyInstanceUid, (counts.get(studyInstanceUid) ?? 0) + 1);
  }
  return counts;
}

function countSeriesByStudy(records: DicomJsonRecord[]): Map<string, number> {
  const seriesByStudy = new Map<string, Set<string>>();
  for (const record of records) {
    const studyInstanceUid = firstStringValue(record, '0020000D');
    const seriesInstanceUid = firstStringValue(record, '0020000E');
    if (!studyInstanceUid || !seriesInstanceUid) {
      continue;
    }

    const series = seriesByStudy.get(studyInstanceUid) ?? new Set<string>();
    series.add(seriesInstanceUid);
    seriesByStudy.set(studyInstanceUid, series);
  }

  return new Map(
    Array.from(seriesByStudy.entries()).map(([studyInstanceUid, series]) => [studyInstanceUid, series.size]),
  );
}

async function fillStudyCounts(
  records: DicomJsonRecord[],
  filters: QueryFilter[],
  requestedTags: string[],
): Promise<DicomJsonRecord[]> {
  const needsSeriesCount =
    requestedTags.includes('00201206') && records.some((record) => !hasValue(record['00201206']));
  const needsInstanceCount =
    requestedTags.includes('00201208') && records.some((record) => !hasValue(record['00201208']));

  if (!needsSeriesCount && !needsInstanceCount) {
    return records;
  }

  const [seriesCounts, instanceCounts] = await Promise.all([
    needsSeriesCount
      ? runFind(QUERY_LEVEL.SERIES, ['0020000D', '0020000E'], filters).then(countSeriesByStudy)
      : Promise.resolve(new Map<string, number>()),
    needsInstanceCount
      ? runFind(QUERY_LEVEL.IMAGE, ['0020000D', '00080018'], filters).then(countByStudy)
      : Promise.resolve(new Map<string, number>()),
  ]);

  return records.map((record) => {
    const studyInstanceUid = firstStringValue(record, '0020000D');
    if (!studyInstanceUid) {
      return record;
    }

    let nextRecord = record;
    if (needsSeriesCount && !hasValue(record['00201206'])) {
      nextRecord = withCount(nextRecord, '00201206', seriesCounts.get(studyInstanceUid) ?? 0);
    }
    if (needsInstanceCount && !hasValue(record['00201208'])) {
      nextRecord = withCount(nextRecord, '00201208', instanceCounts.get(studyInstanceUid) ?? 0);
    }

    return nextRecord;
  });
}

export async function doFind(
  level: QUERY_LEVEL,
  query: QueryParams,
  defaultTags: string[] = tagsForLevel(level),
): Promise<DicomJsonRecord[]> {
  const requestedTags = getRequestedTags(query, defaultTags);
  const { filters, invalidInput } = normalizeFilters(query);
  if (invalidInput) {
    return [];
  }

  const records = await runFind(
    level,
    Array.from(new Set([...requestedTags, ...filters.map((filter) => filter.tag)])),
    filters,
  );

  const parsedOffset = Number.parseInt(query.offset ?? '0', 10);
  const offset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;
  const parsedLimit = Number.parseInt(query.limit ?? '', 10);
  const limit = Number.isNaN(parsedLimit) ? undefined : parsedLimit;
  const slicedRecords =
    limit !== undefined ? records.slice(offset, offset + limit) : records.slice(offset);

  if (level === QUERY_LEVEL.STUDY) {
    return fillStudyCounts(slicedRecords, filters, requestedTags);
  }

  return slicedRecords;
}
