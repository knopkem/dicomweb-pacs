import { FastifyPluginCallback } from 'fastify';
import {
  FrameParams,
  ImageParams,
  QueryParams,
  SeriesParams,
  StudyParams,
  WadoUriQuery,
} from '../types';
import { fetchInstanceMetadata, fetchSeriesMetadata, fetchStudyMetadata } from '../dimse/fetchMeta';
import { doFind } from '../dimse/findData';
import { QUERY_LEVEL } from '../dimse/querLevel';
import { doWadoRsFrame } from '../dimse/wadoRs';
import { doWadoUri } from '../dimse/wadoUri';
import { LoggerSingleton } from '../utils/logger';

const logger = LoggerSingleton.Instance;
const dicomJsonContentType = 'application/dicom+json';

const routes: FastifyPluginCallback = function (server, _opts, done) {
  server.get<{
    Querystring: QueryParams;
  }>('/rs/studies', async (req, reply) => {
    try {
      reply.header('Content-Type', dicomJsonContentType);
      return reply.send(await doFind(QUERY_LEVEL.STUDY, req.query));
    } catch (error) {
      logger.error(error);
      return reply.code(500).send();
    }
  });

  server.get<{
    Params: StudyParams;
    Querystring: QueryParams;
  }>('/rs/studies/:studyInstanceUid/metadata', async (req, reply) => {
    const query = { ...req.query, StudyInstanceUID: req.params.studyInstanceUid };
    try {
      reply.header('Content-Type', dicomJsonContentType);
      return reply.send(await fetchStudyMetadata(query));
    } catch (error) {
      logger.error(error);
      return reply.code(500).send();
    }
  });

  server.get<{
    Params: StudyParams;
    Querystring: QueryParams;
  }>('/rs/studies/:studyInstanceUid/series', async (req, reply) => {
    const query = { ...req.query, StudyInstanceUID: req.params.studyInstanceUid };
    try {
      reply.header('Content-Type', dicomJsonContentType);
      return reply.send(await doFind(QUERY_LEVEL.SERIES, query));
    } catch (error) {
      logger.error(error);
      return reply.code(500).send();
    }
  });

  server.get<{
    Params: SeriesParams;
    Querystring: QueryParams;
  }>('/rs/studies/:studyInstanceUid/series/:seriesInstanceUid/instances', async (req, reply) => {
    const query = {
      ...req.query,
      StudyInstanceUID: req.params.studyInstanceUid,
      SeriesInstanceUID: req.params.seriesInstanceUid,
    };
    try {
      reply.header('Content-Type', dicomJsonContentType);
      return reply.send(await doFind(QUERY_LEVEL.IMAGE, query));
    } catch (error) {
      logger.error(error);
      return reply.code(500).send();
    }
  });

  server.get<{
    Params: SeriesParams;
    Querystring: QueryParams;
  }>('/rs/studies/:studyInstanceUid/series/:seriesInstanceUid/metadata', async (req, reply) => {
    const query = {
      ...req.query,
      StudyInstanceUID: req.params.studyInstanceUid,
      SeriesInstanceUID: req.params.seriesInstanceUid,
    };
    try {
      reply.header('Content-Type', dicomJsonContentType);
      return reply.send(await fetchSeriesMetadata(query));
    } catch (error) {
      logger.error(error);
      return reply.code(500).send();
    }
  });

  server.get<{
    Params: ImageParams;
    Querystring: QueryParams;
  }>('/rs/studies/:studyInstanceUid/series/:seriesInstanceUid/instances/:sopInstanceUid/metadata', async (req, reply) => {
    const query = {
      ...req.query,
      StudyInstanceUID: req.params.studyInstanceUid,
      SeriesInstanceUID: req.params.seriesInstanceUid,
      SOPInstanceUID: req.params.sopInstanceUid,
    };
    try {
      reply.header('Content-Type', dicomJsonContentType);
      return reply.send(await fetchInstanceMetadata(query));
    } catch (error) {
      logger.error(error);
      return reply.code(500).send();
    }
  });

  server.get<{
    Params: FrameParams;
  }>('/rs/studies/:studyInstanceUid/series/:seriesInstanceUid/instances/:sopInstanceUid/frames/:frame', async (req, reply) => {
    const { studyInstanceUid, seriesInstanceUid, sopInstanceUid, frame } = req.params;
    try {
      const response = await doWadoRsFrame({
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid,
        frame,
      });
      reply.header('Content-Type', response.contentType);
      return reply.send(response.buffer);
    } catch (error) {
      logger.error(error);
      return reply.code(500).send(error instanceof Error ? error.message : String(error));
    }
  });

  server.get<{
    Querystring: WadoUriQuery;
  }>('/wadouri', async (req, reply) => {
    const { studyUID, seriesUID, objectUID } = req.query;
    if (!studyUID || !seriesUID || !objectUID) {
      const message = 'Error missing parameters.';
      logger.error(message);
      return reply.code(400).send(message);
    }

    try {
      const response = await doWadoUri({
        studyInstanceUid: studyUID,
        seriesInstanceUid: seriesUID,
        sopInstanceUid: objectUID,
      });
      reply.header('Content-Type', response.contentType);
      return reply.send(response.buffer);
    } catch (error) {
      logger.error(error);
      return reply.code(500).send(error instanceof Error ? error.message : String(error));
    }
  });

  done();
};

module.exports = routes;
