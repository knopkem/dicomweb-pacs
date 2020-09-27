const config = require("config");
const dict = require("dicom-data-dictionary");
const dimse = require("dicom-dimse-native");
const winston = require("winston");
const storage = require("node-persist");
const path = require("path");
const fs = require("fs");

require("winston-daily-rotate-file");

const lock = new Map();

const dailyRotateFile = new winston.transports.DailyRotateFile({
  filename: `${config.get("logDir")}/app-%DATE%.log`, // last part is the filename suffix
  datePattern: "YYYY-MM-DD-HH",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
});

const consoleLogger = new winston.transports.Console();

const logger = new winston.Logger({
  transports: [dailyRotateFile, consoleLogger],
});

const findDicomName = name => {
  // eslint-disable-next-line no-restricted-syntax
  for (const key of Object.keys(dict.standardDataElements)) {
    const value = dict.standardDataElements[key];
    if (value.name === name) {
      return key;
    }
  }
  return undefined;
};

// helper to add minutes to date object
const addMinutes = (date, minutes) => {
  return new Date(date.getTime() + minutes * 60000);
};

// request data from PACS via c-get or c-move
const fetchData = async (studyUid, seriesUid) => {
  // add query retrieve level and fetch whole study
  const j = {
    tags: [
      {
        key: "00080052",
        value: "SERIES",
      },
      {
        key: "0020000D",
        value: studyUid,
      },
      {
        key: "0020000E",
        value: seriesUid,
      },
    ],
  };

  // set source and target from config
  j.source = config.get("source");
  j.target = config.get("target");
  j.verbose = config.get("verboseLogging");
  j.storagePath = config.get("storagePath");

  const scu = config.get("useCget") ? dimse.getScu : dimse.moveScu;

  const prom = new Promise((resolve, reject) => {
    try {
      scu(JSON.stringify(j), result => {
        if (result && result.length > 0) {
          try {
            const json = JSON.parse(result);
            if (json.code === 0 || json.code === 2) {
              storage.getItem(studyUid).then(item => {
                if (!item) {
                  logger.info("stored", path.join(j.storagePath, studyUid));
                  const cacheTime = config.get("keepCacheInMinutes");
                  if (cacheTime >= 0) {
                    storage.setItem(studyUid, addMinutes(new Date(), cacheTime));
                  }
                }
              });
              resolve(result);
            } else {
              logger.info(JSON.parse(result));
            }
          } catch (error) {
            reject(error, result);
          }
          lock.delete(seriesUid);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
  // store in lock
  lock.set(seriesUid, prom);
  return prom;
};

const utils = {
  getLogger: () => {
    return logger;
  },

  init: async () => {
    await storage.init();
  },

  startScp: () => {
    const j = {};
    j.source = config.get("source");
    j.storagePath = config.get("storagePath");
    j.verbose = config.get("verboseLogging");

    dimse.startScp(JSON.stringify(j), result => {
      try {
        logger.info(JSON.parse(result));
      } catch (error) {
        logger.error(error, result);
      }
    });
  },

  sendEcho: () => {
    const j = {};
    j.source = config.get("source");
    j.target = config.get("target");
    j.verbose = config.get("verboseLogging");

    logger.info(`sending C-ECHO to target: ${j.target.aet}`);
    dimse.echoScu(JSON.stringify(j), result => {
      if (result && result.length > 0) {
        try {
          logger.info(JSON.parse(result));
        } catch (error) {
          logger.error(result);
        }
      }
    });
  },

  // fetch and wait
  waitOrFetchData: (studyUid, seriesUid) => {
    // check if already locked and return promise
    if (lock.has(seriesUid)) {
      return lock.get(seriesUid);
    }
    return fetchData(studyUid, seriesUid);
  },

  // remove cached data if outdated
  clearCache: async (storagePath, currentUid, clearAll) => {
    const currentDate = new Date();
    storage.forEach(item => {
      const dt = new Date(item.value);
      const directory = path.join(storagePath, item.key);
      if ((dt.getTime() < currentDate.getTime() && item.key !== currentUid) || clearAll) {
        fs.rmdir(
          directory,
          {
            recursive: true,
          },
          error => {
            if (error) {
              logger.error(error);
            } else {
              logger.info("deleted", directory);
              storage.rm(item.key); // not nice but seems to work
            }
          }
        );
      }
    });
  },

  fileExists: pathname => {
    return new Promise((resolve, reject) => {
      fs.access(pathname, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  doFind: (queryLevel, query, defaults) => {
    // add query retrieve level
    const j = {
      tags: [
        {
          key: "00080052",
          value: queryLevel,
        },
      ],
    };

    // set source and target from config
    j.source = config.get("source");
    j.target = config.get("target");
    j.verbose = config.get("verboseLogging");

    // parse all include fields
    const includes = query.includefield;

    let tags = [];
    if (includes) {
      tags = includes.split(",");
    }
    tags.push(...defaults);

    // add parsed tags
    tags.forEach(element => {
      const tagName = findDicomName(element) || element;
      j.tags.push({ key: tagName, value: "" });
    });

    // add search param
    let isValidInput = false; 
    Object.keys(query).forEach( propName => {
      const tag = findDicomName(propName);
      if (tag) {
        let v = query[propName];
        // patient name check
        if (tag === "00100010") {
          // check if minimum number of chars for patient name are given 
          if (config.get("qidoMinChars") > v.length) {
            isValidInput = true;
          }
          // auto append wildcard
          if (config.get("qidoAppendWildcard")) {
            v += "*";
          }
        }
        j.tags.push({ key: tag, value: v });
      }
  })
  // return with empty results if invalid 
  if (isValidInput) {
    return [];
  }

    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    // run find scu and return json response
    return new Promise((resolve) => {
      dimse.findScu(JSON.stringify(j), result => {
        if (result && result.length > 0) {
            try {
                const json = JSON.parse(result);
                if (json.code === 0) {
                const container = JSON.parse(json.container);
                if (container) {
                    resolve(container.slice(offset));
                } else {
                    resolve([]);
                }
                } else if (json.code === 1) {
                    logger.info('query is pending...');
                } else {
                    logger.error(`c-find failure: ${json.message}`);
                    resolve([]);
                }
            } catch (error) {
                    logger.error(error);
                    logger.error(result);
                    resolve([]);
                }
        } else {
            logger.error('invalid result received');
            resolve([]);
        }
      });
    });
  },
};
module.exports = utils;
