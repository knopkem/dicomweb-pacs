const config = require('config');
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const dicomParser = require('dicom-parser');
const crypto = require('crypto');
const fastify = require('fastify')({ logger: false });
const { Readable } = require('stream');

// make sure default directories exist
shell.mkdir('-p', config.get('logDir'));
shell.mkdir('-p', './data');

const utils = require('./utils.js');

fastify.register(require('fastify-static'), {
  root: path.join(__dirname, '../public')
});

fastify.register(require('fastify-cors'), { 
});

const logger = utils.getLogger();


// log exceptions
process.on('uncaughtException', (err) => {
  logger.error('uncaught exception received:');
  logger.error(err.stack);
  process.exit(1);
});

//------------------------------------------------------------------

fastify.get('/rs/studies', async (req, reply) => {
  const tags = utils.studyLevelTags();
  const json = await utils.doFind('STUDY', req.query, tags);
  reply.send(json);
});

//------------------------------------------------------------------

fastify.get('/viewer/rs/studies', async (req, reply) => {
  const tags = utils.studyLevelTags();
  const json = await utils.doFind('STUDY', req.query, tags);
  reply.send(json);
});

//------------------------------------------------------------------

fastify.get(
  '/viewer/rs/studies/:studyInstanceUid/metadata',
  async (req, reply) => {
    const { query } = req;
    query.StudyInstanceUID = req.params.studyInstanceUid;
    const tags = utils.seriesLevelTags();
    const json = await utils.doFind('SERIES', query, tags);
    reply.send(json);
  }
);

//------------------------------------------------------------------

fastify.get(
  '/viewer/rs/studies/:studyInstanceUid/series',
  async (req, reply) => {
    const tags = utils.seriesLevelTags();
    const { query } = req;
    query.StudyInstanceUID = req.params.studyInstanceUid;

    const json = await utils.doFind('SERIES', query, tags);
    reply.send(json);
  }
);

//------------------------------------------------------------------

fastify.get(
  '/viewer/rs/studies/:studyInstanceUid/series/:seriesInstanceUid/instances',
  async (req, reply) => {
    const tags = utils.imageLevelTags();
    const { query } = req;
    query.StudyInstanceUID = req.params.studyInstanceUid;
    query.SeriesInstanceUID = req.params.seriesInstanceUid;

    const json = await utils.doFind('IMAGE', query, tags);
    reply.send(json);
  }
);

//------------------------------------------------------------------

fastify.get(
  '/viewer/rs/studies/:studyInstanceUid/series/:seriesInstanceUid/metadata',
  async (req, reply) => {
    const tags = utils.imageMetadataTags();
    const { query } = req;
    query.StudyInstanceUID = req.params.studyInstanceUid;
    query.SeriesInstanceUID = req.params.seriesInstanceUid;

    const json = await utils.doFind('IMAGE', query, tags);
    reply.send(json);
  }
);

//------------------------------------------------------------------

fastify.get(
  '/viewer/rs/studies/:studyInstanceUid/series/:seriesInstanceUid/instances/:sopInstanceUid/frames/:frame',
  async (req, reply) => {
    const {
      studyInstanceUid,
      sopInstanceUid,
    } = req.params;

    const storagePath = config.get('storagePath');
    const studyPath = path.join(storagePath, studyInstanceUid)
    const pathname = path.join(studyPath, sopInstanceUid);
  
    try {
      // logger.info(studyInstanceUid, seriesInstanceUid, sopInstanceUid, frame);
      await utils.fileExists(pathname);
    } catch (error) {
      logger.error(error);
      reply.code(404);
      reply.send(`File ${pathname} not found!`);
      return;
    }

    try {
      await utils.compressFile(pathname, studyPath);
    } catch (error) {
        logger.error(error);
        const msg = `failed to compress ${pathname}`;
        reply.code(500);
        reply.send(msg);
        return;
    }  

    // read file from file system
    try {
      const data = await fs.promises.readFile(pathname);
      const dataset = dicomParser.parseDicom(data);
      const pixelDataElement = dataset.elements.x7fe00010;
      const buffer = Buffer.from(
        dataset.byteArray.buffer,
        pixelDataElement.dataOffset,
        pixelDataElement.length
      );

      const term = '\r\n';
      const boundary = crypto.randomBytes(16).toString('hex');
      const contentId = crypto.randomBytes(16).toString('hex');
      const endline = `${term}--${boundary}--${term}`;

      reply.header(
        'Content-Type',
        `multipart/related;start=${contentId};type='application/octed-stream';boundary='${boundary}'`
      );

      const readStream = new Readable({
        read() {
          this.push(`${term}--${boundary}${term}`);
          this.push(`Content-Location:localhost${term}`);
          this.push(`Content-ID:${contentId}${term}`);
          this.push(`Content-Type:application/octet-stream${term}`);
          this.push(term);
          this.push(buffer);
          this.push(endline);
          this.push(null);
        },
      });

      reply.send(readStream);
    } catch (error) {
      logger.error(error);
      reply.code(500);
      reply.send(`Error getting the file: ${error}.`);
    }
  }
);

//------------------------------------------------------------------

fastify.get('/viewer/wadouri/', async (req, reply) => {
  const studyUid = req.query.studyUID;
  const seriesUid = req.query.seriesUID;
  const imageUid = req.query.objectUID;
  if (!studyUid || !seriesUid || !imageUid) {
    const msg = `Error missing parameters.`;
    logger.error(msg);
    reply.code(500);
    reply.send(msg);
    return;
  }
  const storagePath = config.get('storagePath');
  const studyPath = path.join(storagePath, studyUid)
  const pathname = path.join(studyPath, imageUid);

  try {
    await utils.fileExists(pathname);
  } catch (error) {
      logger.error(error);
      const msg = `file not found ${pathname}`;
      reply.code(500);
      reply.send(msg);
      return;
  }

  try {
    await utils.compressFile(pathname, studyPath);
  } catch (error) {
      logger.error(error);
      const msg = `failed to compress ${pathname}`;
      reply.code(500);
      reply.send(msg);
      return;
  }

  // if the file is found, set Content-type and send data
  reply.header(
    'Content-Type',
    'application/dicom'
  );

  // read file from file system
  fs.readFile(pathname, (err, data) => {
    if (err) {
      const msg = `Error getting the file: ${err}.`;
      logger.error(msg);
      reply.setCode(500);
      reply.send(msg);
    }
    reply.send(data);
  });
});

//------------------------------------------------------------------

const port= config.get('webserverPort');
logger.info('starting...');
fastify.listen(port, (err, address) => {
  if (err) {
    logger.error(err, address);
    process.exit(1);
  }
  logger.info(`web-server listening on port: ${port}`);
  utils.startScp();
  utils.sendEcho();
});

//------------------------------------------------------------------
