var modules = {};
module['exports'] = modules;

var config = require('../../config');

var redis = require("redis"),
    client = redis.createClient(config.redis.port, config.redis.host);

var MAX_modulesS_PER_HOOK = 50;

// TODO: better error handling and client setup/teardown
client.on("error", function (err) {
    console.log("Error " + err);
});

modules.all = function all (filter, cb) {
  filter.status = filter.status || "installed";
  client.hkeys('/modules/' + filter.status, function(err, keys){
    cb(err, keys);
  });
};