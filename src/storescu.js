/* eslint-disable no-console */
const dimse = require('dicom-dimse-native');
const config = require('config');
const path = require('path');

const j = {};
j.source = config.get('source');
j.target = j.source;
j.sourcePath = path.join(__dirname, '../import');
j.verbose = true;
dimse.storeScu(j, result => {
  if (result && result.length > 0) {
    try {
      console.log(JSON.parse(result));
    } catch (e) {
      console.error(e, result);
    }
  }
});
