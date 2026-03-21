export type QueryParams = Record<string, string | undefined>;

export interface DicomJsonElement {
  Value?: Array<string | number | boolean | Record<string, unknown>>;
  vr: string;
  [key: string]: unknown;
}

export type DicomJsonRecord = Record<string, DicomJsonElement>;

export interface DicomResponse {
  code: number;
  message: string;
  container?: string;
}

export interface StudyParams {
  studyInstanceUid: string;
}

export interface SeriesParams extends StudyParams {
  seriesInstanceUid: string;
}

export interface ImageParams extends SeriesParams {
  sopInstanceUid: string;
}

export interface FrameParams extends ImageParams {
  frame: string;
}

export interface WadoUriQuery {
  studyUID?: string;
  seriesUID?: string;
  objectUID?: string;
}

export interface BinaryResponse {
  contentType: string;
  buffer: Buffer;
}
