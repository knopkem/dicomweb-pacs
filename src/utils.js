const config = require("config");
const dict = require("dicom-data-dictionary");
const dimse = require("dicom-dimse-native");
const fs = require("fs");

// create a rolling file logger based on date/time that fires process events
const opts = {
  errorEventName: "error",
  logDirectory: "./logs", // NOTE: folder must exist and be writable...
  fileNamePattern: "roll-<DATE>.log",
  dateFormat: "YYYY.MM.DD"
};
const manager = require("simple-node-logger").createLogManager();
// manager.createConsoleAppender();
manager.createRollingFileAppender(opts);
const logger = manager.createLogger();

//------------------------------------------------------------------

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

//------------------------------------------------------------------

const utils = {
  getLogger: () => {
    return logger;
  },
  startScp: () => {
    const source = config.get("source");
    const ar = config.get("peers");
    const peers = [];
    ar.forEach(aet => {
      peers.push(aet);
    });

    const ts = config.get("transferSyntax");
    const j = {};
    j.source = source;
    j.target = j.source;
    j.peers = peers;
    j.peers.push(j.source);
    j.storagePath = config.get("storagePath");
    j.verbose = config.get("verboseLogging");
    j.netTransferPrefer = ts;
    j.netTransferPropose = ts;
    j.writeTransfer = ts;

    logger.info(`pacs-server listening on port: ${j.source.port}`);

    dimse.startScp(JSON.stringify(j), result => {
      // currently this will never finish
      logger.info(JSON.parse(result));
    });
  },
  shutdown: () => {
    const j = {};
    j.source = config.get('source');
    j.target = config.get('source');
    j.verbose = config.get('verboseLogging');

    logger.info(`sending shutdown request to target: ${j.target.aet}`);

    return new Promise((resolve, reject) => {
      dimse.shutdownScu(JSON.stringify(j), (result) => {
        if (result && result.length > 0) {
          try {
            logger.info(JSON.parse(result));
            resolve();
          } catch (error) {
            logger.error(result);
            reject();
          }
        }
        reject();
      });
    });
  },
  sendEcho: () => {
    const j = {};
    j.source = config.get("source");
    j.target = j.source;
    j.verbose = config.get("verboseLogging");

    logger.info(`sending C-ECHO to target: ${j.target.aet}`);

    return new Promise((resolve, reject) => {
      dimse.echoScu(JSON.stringify(j), result => {
        if (result && result.length > 0) {
          try {
            logger.info(JSON.parse(result));
            resolve();
          } catch (error) {
            logger.error(result);
            reject();
          }
        }
        reject();
      });
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
  studyLevelTags: () => {
    return [
      "00080005",
      "00080020",
      "00080030",
      "00080050",
      "00080054",
      "00080056",
      "00080061",
      "00080090",
      "00081190",
      "00100010",
      "00100020",
      "00100030",
      "00100040",
      "0020000D",
      "00200010",
      "00201206",
      "00201208"
    ];
  },
  seriesLevelTags: () => {
    return ["00080005", "00080054", "00080056", "00080060", "0008103E", "00081190", "0020000E", "00200011", "00201209"];
  },
  imageLevelTags: () => {
    return ["00080016", "00080018"];
  },
  imageMetadataTags: () => {
    return [
      "00080016",
      "00080018",
      "00080060",
      "00280002",
      "00280004",
      "00280010",
      "00280011",
      "00280030",
      "00280100",
      "00280101",
      "00280102",
      "00280103",
      "00281050",
      "00281051",
      "00281052",
      "00281053",
      "00200032",
      "00200037"
    ];
  },
  compressFile: (inputFile, outputDirectory) => {
    const j = {
      sourcePath: inputFile,
      storagePath: outputDirectory,
      writeTransfer: config.get("transferSyntax"),
      verbose: config.get("verboseLogging")
    };

    // run find scu and return json response
    return new Promise((resolve, reject) => {
      dimse.recompress(JSON.stringify(j), result => {
        if (result && result.length > 0) {
          try {
            const json = JSON.parse(result);
            if (json.code === 0) {
              resolve();
            } else {
              logger.error(`recompression failure (${inputFile}): ${json.message}`);
              reject();
            }
          } catch (error) {
            logger.error(error);
            logger.error(result);
            reject();
          }
        } else {
          logger.error("invalid result received");
          reject();
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
          value: queryLevel
        }
      ]
    };

    // set source and target from config
    j.source = config.get("source");
    j.target = j.source;
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
    Object.keys(query).forEach(propName => {
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
    });
    // return with empty results if invalid
    if (isValidInput) {
      return [];
    }

    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    // run find scu and return json response
    return new Promise(resolve => {
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
              logger.info("query is pending...");
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
          logger.error("invalid result received");
          resolve([]);
        }
      });
    });
  }
};
module.exports = utils;
