const config = {};

// our SCP (only used if useCget is false
config.source = {
  aet: "DICOMWEB_PROXY",
  ip: "127.0.0.1",
  port: "8888"
};

// our target PACS
config.target = {
  aet: "CONQUESTSRV1",
  ip: "127.0.0.1",
  port: "5678"
};

// log directory
config.logDir = "./logs";

// cache directory
config.storagePath = "./data";

// webserver port
config.webserverPort = 5000;

// use keycloak auth
config.useKeycloakAuth = false;

// target PACS supports C-Get (if flase use C-Move instead)
config.useCget = true;

// how long before deleting cache, -1 for eternity
config.keepCacheInMinutes = 60;

// remove all cached files when starting the server 
config.clearCacheOnStartup = true;

// do not issue c-find if search contains less characters
config.qidoMinChars = 0;

// auto append * for patient name query
config.qidoAppendWildcard = true;

// enable verbose logging to std::out (contains DIMSE output)
config.verboseLogging = false;

module.exports = config;
