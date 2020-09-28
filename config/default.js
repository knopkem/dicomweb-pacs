const config = {
    
    source: {
      aet: "DICOMWEB_PACS",
      ip: "127.0.0.1",
      port: "8888"
    },
    peers: [
      {
        aet: "SERVER",
        ip: "127.0.0.1",
        port: "104"
      }],
    logDir: "./logs",
    storagePath: "./data",
    webserverPort: 5000,
    qidoMinChars: 0, // do not issue c-find if search contains less characters
    qidoAppendWildcard: true, // auto append * for patient name query
    permissiveMode: true, // when set to false, all AETs able to query and push need to be in peers
    verboseLogging: false // enable verbose logging to std::out (contains DIMSE output)
};

module.exports = config;
