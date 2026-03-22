import { DicomJsonRecord, QueryParams } from '../types';
import { doFind } from './findData';
import { QUERY_LEVEL } from './querLevel';
import { imageMetadataTags, seriesLevelTags, studyLevelTags } from './tags';

function applyDefault(
  record: DicomJsonRecord,
  tag: string,
  vr: string,
  defaultValue: string | number,
): DicomJsonRecord {
  if (record[tag]?.Value) {
    return record;
  }

  return {
    ...record,
    [tag]: {
      Value: [defaultValue],
      vr,
    },
  };
}

function fixResponse(records: DicomJsonRecord[]): DicomJsonRecord[] {
  return records.map((record) => {
    let nextRecord = record;
    nextRecord = applyDefault(nextRecord, '00281050', 'DS', 100.0);
    nextRecord = applyDefault(nextRecord, '00281051', 'DS', 100.0);
    nextRecord = applyDefault(nextRecord, '00281052', 'DS', 1.0);
    nextRecord = applyDefault(nextRecord, '00281053', 'DS', 1.0);
    return nextRecord;
  });
}

export async function fetchStudyMetadata(query: QueryParams): Promise<DicomJsonRecord[]> {
  return doFind(QUERY_LEVEL.SERIES, query, [...studyLevelTags, ...seriesLevelTags]);
}

export async function fetchSeriesMetadata(query: QueryParams): Promise<DicomJsonRecord[]> {
  const records = await doFind(QUERY_LEVEL.IMAGE, query, [
    ...studyLevelTags,
    ...seriesLevelTags,
    ...imageMetadataTags,
  ]);
  return fixResponse(records);
}

export async function fetchInstanceMetadata(query: QueryParams): Promise<DicomJsonRecord[]> {
  const records = await doFind(QUERY_LEVEL.IMAGE, query, [
    ...studyLevelTags,
    ...seriesLevelTags,
    ...imageMetadataTags,
  ]);
  return fixResponse(records);
}
