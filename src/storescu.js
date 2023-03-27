/* eslint-disable no-console */
const dimse = require('dicom-dimse-native');
const config = require('config');
const path = require('path');
const walk = require('fs-walk');

const j = {};
j.source = config.get('source');
j.target = j.source;
j.verbose = true;
j.sourcePath = path.join(__dirname, '../import');
dimse.storeScu(j, result => {
  if (result && result.length > 0) {
    try {
      console.log(JSON.parse(result));
    } catch (e) {
      console.error(e, result);
    }
  }
});

walk.walkSync(path.join(__dirname,'../import'), function(basedir, filename, stat) {
  if (stat.isDirectory()) {
    j.sourcePath = basedir;
    dimse.storeScu(j, result => {
      if (result && result.length > 0) {
        try {
          console.log(JSON.parse(result));
        } catch (e) {
          console.error(e, result);
        }
      }
    });
  }
});
