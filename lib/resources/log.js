var config = require('../../config');

var logs = require("hook.io-logs");

// Remark: This could be moved to `hook.io-logs` library as helper Logger method
var Logger = logs.Logger = function Logger (opts) {
   var self = this;
   self.ip = opts.ip;
   self.owner = opts.service.owner;
   self.name = opts.service.name;
   return self;
 }

Logger.prototype.log = function () {
  var self = this;
  var args = [];
  for (var a in arguments) {
    args.push(arguments[a]);
  }
  if (args.length === 1) {
    args = args[0];
  }
  // create log entry
  var entry = {
    time: new Date(),
    data: args,
    ip : self.ip
  };
  // push entry to log datasource
  logs.push("/" + self.owner + "/" + self.name, entry, function(err, res) {
    if (err) {
      console.log('Error pushing log entry to datasource! ', err.message);
    }
  });
};

module['exports'] = logs;

logs.start(config.redis);