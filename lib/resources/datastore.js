// datastore.js resource - provides a key / value store interface for hooks to perist data
// see: http://github.com/bigcompany/hook.io-datastore

var config = require('../../config');
var datastore = require("hook.io-datastore");

module['exports'] = datastore;

datastore.start({
  port: config.redis.port,
  host: config.redis.host
});