const server = require('fastify')({
  logger: false,
});
const fastifyStatic = require('@fastify/static');
const fastifyCors = require('@fastify/cors');
const fastifySensible = require('@fastify/sensible');
const fastifyHelmet = require('@fastify/helmet');
const fastifyAutoload = require('@fastify/autoload');
const closeWithGrace = require('close-with-grace');

const config = require('config');
const path = require('path');
const utils = require('./utils');

const logger = utils.getLogger();

server.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
});
server.setNotFoundHandler((_req, res) => {
  res.sendFile('index.html');
});
server.register(fastifyCors, {});
server.register(fastifySensible);
server.register(fastifyHelmet, {
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
});

server.register(fastifyAutoload, {
  dir: path.join(__dirname, 'routes'),
});
server.register(fastifyAutoload, {
  dir: path.join(__dirname, 'routes'),
  options: { prefix: '/viewer' },
});

server.setErrorHandler(async (err) => {
  logger.error(err.message); // 'caught'
});

// log exceptions
process.on('uncaughtException', (err) => {
  logger.error('uncaught exception received:');
  logger.error(err.stack);
});

//------------------------------------------------------------------
closeWithGrace({ delay: 500 }, async ({ signal, err, manual }) => {
  if (err) {
    logger.error(err);
  }
  logger.info('shutting down...', signal, manual);
  try {
    await server.close();
    await utils.shutdown();
    server.close();
  } catch (error) {
    logger.error(error);
  }
});

//------------------------------------------------------------------

const port = config.get('webserverPort');
logger.info('starting...');
server.listen({ port, host: '0.0.0.0' }, async (err, address) => {
  if (err) {
    await logger.error(err, address);
    process.exit(1);
  }
  logger.info(`web-server listening on port: ${port}`);
  utils.startScp();
  utils.sendEcho();
});

//------------------------------------------------------------------
