var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
module['exports'] = function invalidateCache (h, cb) {
  var hook = require('./');
  // since we are doing a rimraf here based on user input,
  // let's validate the integrity of the user input based on hook.find
  hook.find({ owner: h.owner, name: h.name }, function (err, results){
    if (err) {
      return cb(err);
    }
    if (results.length === 0) {
      return cb(new Error('No Hook Found! Cannot refresh.'));
    }
    // _h ensures that hook actually exists
    var _h = results[0];
    var tempDir = __dirname + '/../../../temp/' + _h.owner + '/' + _h.name;
    tempDir = path.resolve(tempDir);
    rimraf(tempDir, cb);
  });
};