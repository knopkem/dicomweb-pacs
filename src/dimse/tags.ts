import { QUERY_LEVEL } from './querLevel';

export const studyLevelTags: string[] = [
  '00080005',
  '00080020',
  '00080030',
  '00080050',
  '00080054',
  '00080056',
  '00080061',
  '00080090',
  '00081190',
  '00100010',
  '00100020',
  '00100030',
  '00100040',
  '0020000D',
  '00200010',
  '00201206',
  '00201208',
];

export const seriesLevelTags: string[] = [
  '00080005',
  '00080054',
  '00080056',
  '00080060',
  '0008103E',
  '00081190',
  '0020000E',
  '00200011',
  '00201209',
];

export const imageLevelTags: string[] = ['00080016', '00080018'];

export const imageMetadataTags: string[] = [
  '00080016',
  '00080018',
  '00080060',
  '00280002',
  '00280004',
  '00280010',
  '00280011',
  '00280030',
  '00280100',
  '00280101',
  '00280102',
  '00280103',
  '00281050',
  '00281051',
  '00281052',
  '00281053',
  '00200032',
  '00200037',
];

export function tagsForLevel(level: QUERY_LEVEL): string[] {
  switch (level) {
    case QUERY_LEVEL.STUDY:
      return studyLevelTags;
    case QUERY_LEVEL.SERIES:
      return seriesLevelTags;
    case QUERY_LEVEL.IMAGE:
      return imageLevelTags;
    default:
      return studyLevelTags;
  }
}
