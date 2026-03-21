export enum QUERY_LEVEL {
  STUDY,
  SERIES,
  IMAGE,
}

export function queryLevelToString(level: QUERY_LEVEL): string {
  switch (level) {
    case QUERY_LEVEL.STUDY:
      return 'STUDY';
    case QUERY_LEVEL.SERIES:
      return 'SERIES';
    case QUERY_LEVEL.IMAGE:
      return 'IMAGE';
    default:
      return 'STUDY';
  }
}
