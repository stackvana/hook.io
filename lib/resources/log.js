var config = require('../../config');

var logs = require("hook.io-logs");

module['exports'] = logs;

logs.start(config.redis);