import path from 'path';
import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyAutoload from '@fastify/autoload';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifySensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import closeWithGrace from 'close-with-grace';
import { shutdown, startScp } from './dimse/store';
import { ConfParams, config } from './utils/config';
import { ensureDirectories } from './utils/fileHelper';
import { LoggerSingleton } from './utils/logger';

const logger = LoggerSingleton.Instance;
const server: FastifyInstance = fastify();

server.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
});

server.setNotFoundHandler((_req: FastifyRequest, reply: FastifyReply) => {
  reply.sendFile('index.html');
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

server.setErrorHandler((err, _req, reply) => {
  logger.error(err);
  reply.send(err);
});

process.on('uncaughtException', (err) => {
  logger.error('uncaught exception received:');
  logger.error(err.stack ?? err.message);
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled rejection received:');
  logger.error(reason);
});

closeWithGrace({ delay: 500 }, async ({ signal, err, manual }) => {
  if (err) {
    logger.error(err);
  }
  logger.info('shutting down...', signal, manual);
  try {
    await server.close();
    await shutdown();
  } catch (error) {
    logger.error(error);
  }
});

async function start() {
  await ensureDirectories();

  const port = config.get<number>(ConfParams.HTTP_PORT);
  const host = config.get<string>(ConfParams.HTTP_IP);
  logger.info('starting...');

  await server.listen({ port, host });
  logger.info(`web-server listening on port: ${port}`);
  startScp();
}

start().catch((error) => {
  logger.error(error);
  process.exit(1);
});
