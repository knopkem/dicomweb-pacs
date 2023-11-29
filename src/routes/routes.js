const fs = require('fs');
const path = require('path');
const dicomParser = require('dicom-parser');
const crypto = require('crypto');
const { Readable } = require('stream');
const config = require('config');
const utils = require('../utils');

const logger = utils.getLogger();

function applyDefault(json, tag, vr, defaultValue) {
  const rsp = json;
  if (!rsp[tag]?.Value) {
    rsp[tag] = {
      Value: [defaultValue],
      vr,
    };
  }
  return rsp;
}

// just make sure these have some sane defaults (while actually these are depending on the type and the viewer should cope with it, but OHIF doesn't)
function fixResponse(json) {
  const rspArray = [];
  json.forEach(element => {
    let rsp = element;
    rsp = applyDefault(rsp, '00281050', 'DS', '100.0');
    rsp = applyDefault(rsp, '00281051', 'DS', '100.0');
    rsp = applyDefault(rsp, '00281052', 'DS', '1.0');
    rsp = applyDefault(rsp, '00281053', 'DS', '1.0');
    rspArray.push(rsp);
  });
  return rspArray;
}

module.exports = function routes(server, opts, done) {
  //------------------------------------------------------------------

  server.get('/rs/studies', async (req, reply) => {
    const tags = utils.studyLevelTags();
    const json = await utils.doFind('STUDY', req.query, tags);
    reply.header('Content-Type', 'application/dicom+json');
    return json;
  });

  //------------------------------------------------------------------

  server.get('/rs/studies/:studyInstanceUid/metadata', async (req, reply) => {
    const { query } = req;
    query.StudyInstanceUID = req.params.studyInstanceUid;
    const stTags = utils.studyLevelTags();
    const serTags = utils.seriesLevelTags();
    const json = await utils.doFind('SERIES', query, [...stTags, ...serTags]);
    reply.header('Content-Type', 'application/dicom+json');
    return json;
  });

  //------------------------------------------------------------------

  server.get('/rs/studies/:studyInstanceUid/series', async (req, reply) => {
    const tags = utils.seriesLevelTags();
    const { query } = req;
    query.StudyInstanceUID = req.params.studyInstanceUid;

    const json = await utils.doFind('SERIES', query, tags);
    reply.header('Content-Type', 'application/dicom+json');
    return json;
  });

  //------------------------------------------------------------------

  server.get('/rs/studies/:studyInstanceUid/series/:seriesInstanceUid/instances', async (req, reply) => {
    const tags = utils.imageLevelTags();
    const { query } = req;
    query.StudyInstanceUID = req.params.studyInstanceUid;
    query.SeriesInstanceUID = req.params.seriesInstanceUid;

    const json = await utils.doFind('IMAGE', query, tags);
    reply.header('Content-Type', 'application/dicom+json');
    return json;
  });

  //------------------------------------------------------------------

  server.get('/rs/studies/:studyInstanceUid/series/:seriesInstanceUid/metadata', async (req, reply) => {
    const stTags = utils.studyLevelTags();
    const serTags = utils.seriesLevelTags();
    const imTags = utils.imageMetadataTags();
    const { query } = req;
    query.StudyInstanceUID = req.params.studyInstanceUid;
    query.SeriesInstanceUID = req.params.seriesInstanceUid;

    const json = await utils.doFind('IMAGE', query, [...stTags, ...serTags, ...imTags]);
    reply.header('Content-Type', 'application/dicom+json');
    return fixResponse(json);
  });

  //------------------------------------------------------------------

  server.get('/rs/studies/:studyInstanceUid/series/:seriesInstanceUid/instances/:sopInstanceUid/metadata', async (req, reply) => {
    const stTags = utils.studyLevelTags();
    const serTags = utils.seriesLevelTags();
    const imTags = utils.imageMetadataTags();
    const { query } = req;
    query.StudyInstanceUID = req.params.studyInstanceUid;
    query.SeriesInstanceUID = req.params.seriesInstanceUid;
    query.SOPInstanceUID = req.params.sopInstanceUid;

    const json = await utils.doFind('IMAGE', query, [...stTags, ...serTags, ...imTags]);
    reply.header('Content-Type', 'application/dicom+json');
    return fixResponse(json);
  });

  //------------------------------------------------------------------

  server.get('/rs/studies/:studyInstanceUid/series/:seriesInstanceUid/instances/:sopInstanceUid/frames/:frame', async (req, reply) => {
    const { studyInstanceUid, seriesInstanceUid, sopInstanceUid } = req.params;

    const storagePath = config.get('storagePath');
    const studyPath = path.join(storagePath, studyInstanceUid);
    const pathname = path.join(studyPath, sopInstanceUid);

    let contentLocation = `/studies/${studyInstanceUid}`;
    if (seriesInstanceUid) {
      contentLocation += `/series/${seriesInstanceUid}`;
    }
    if (sopInstanceUid) {
      contentLocation += `/instance/${sopInstanceUid}`;
    }

    try {
      // logger.info(studyInstanceUid, seriesInstanceUid, sopInstanceUid, frame);
      await utils.fileExists(pathname);
    } catch (error) {
      logger.error(error);
      reply.code(404);
      return `File ${pathname} not found!`;
    }

    try {
      await utils.compressFile(pathname, studyPath, '1.2.840.10008.1.2'); // for now default to uncompressed
    } catch (error) {
      logger.error(error);
      reply.code(500);
      return `failed to compress ${pathname}`;
    }

    // read file from file system
    try {
      const data = await fs.promises.readFile(pathname);
      const dataset = dicomParser.parseDicom(data);
      const pixelDataElement = dataset.elements.x7fe00010;
      const buffer = Buffer.from(dataset.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length);

      const term = '\r\n';
      const boundary = crypto.randomBytes(16).toString('hex');
      const endline = `${term}--${boundary}--${term}`;

      reply.header('Content-Type', `multipart/related;type='application/octed-stream';boundary='${boundary}'`);

      const readStream = new Readable({
        read() {
          this.push(`${term}--${boundary}${term}`);
          this.push(`Content-Location:${contentLocation};${term}`);
          this.push(`Content-Type:application/octet-stream;${term}`);
          this.push(term);
          this.push(buffer);
          this.push(endline);
          this.push(null);
        },
      });
      return readStream;
    } catch (error) {
      logger.error(error);
      reply.code(500);
      return `Error getting the file: ${error}.`;
    }
  });

  //------------------------------------------------------------------

  server.get('/wadouri', async (req, reply) => {
    const studyUid = req.query.studyUID;
    const seriesUid = req.query.seriesUID;
    const imageUid = req.query.objectUID;
    if (!studyUid || !seriesUid || !imageUid) {
      const msg = `Error missing parameters.`;
      logger.error(msg);
      reply.code(500);
      return msg;
    }
    const storagePath = config.get('storagePath');
    const studyPath = path.join(storagePath, studyUid);
    const pathname = path.join(studyPath, imageUid);

    try {
      await utils.fileExists(pathname);
    } catch (error) {
      logger.error(error);
      const msg = `file not found ${pathname}`;
      reply.code(500);
      return msg;
    }

    try {
      await utils.compressFile(pathname, studyPath);
    } catch (error) {
      logger.error(error);
      const msg = `failed to compress ${pathname}`;
      reply.code(500);
      return msg;
    }

    // read file from file system
    try {
      const data = await fs.promises.readFile(pathname);
      reply.header('Content-Type', 'application/dicom+json');
      return data;
    } catch (error) {
      const msg = `Error getting the file: ${error}.`;
      logger.error(msg);
      reply.setCode(500);
      return msg;
    }
  });
  done();
};
