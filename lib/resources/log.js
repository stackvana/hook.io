var config = require('../../config');

var logs = require("hook.io-logs");

module['exports'] = logs;

logs.start({
  port: config.redis.port,
  host: config.redis.host
});