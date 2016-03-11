// datastore.js resource - provides a key / value store interface for hooks to perist data
// see: http://github.com/bigcompany/hook.io-datastore

var config = require('../../config');
var datastore = require("hook.io-datastore");
datastore.start(config.redis, function (err){
  if (err) {
    throw err;
  }
});
// TOOD: Datastore needs to have EE pattern with role checks
// currently Datastore role logic is handled in /view/datastore/* ( not ideal )

module['exports'] = datastore;