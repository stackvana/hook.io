// datastore.js resource - provides a key / value store interface for hooks to perist data
// see: http://github.com/bigcompany/hook.io-datastore

var config = require('../../config');
var datastore = require("hook.io-datastore");
// TODO: Datastore needs to have EE pattern with role checks
// currently Datastore role logic is handled in /view/datastore/* ( not ideal )
datastore.start({
  port: config.redis.port,
  host: config.redis.host,
  password: config.redis.password
});

module['exports'] = datastore;