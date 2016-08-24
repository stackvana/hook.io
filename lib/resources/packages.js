var packages = {};
module['exports'] = packages;

var config = require('../../config');

var redis = require("redis"),
    client = redis.createClient(config.redis.port, config.redis.host);

if (config.redis.password !== null) {
  client.auth(config.redis.password);
}

var MAX_packagesS_PER_HOOK = 50;

// TODO: better error handling and client setup/teardown
client.on("error", function (err) {
    console.log("Error " + err);
});

packages.all = function all (filter, cb) {
  client.hkeys('/packages/npm/' + filter.status, function(err, keys){
    cb(err, keys);
  });
};

packages.setStatus = function add (filter, pkg, cb) {
  // add entry to set
  client.hset("/packages/npm/" + filter.status, pkg, "", function (err, res){
    if (err) {
      throw err;
    }
    return cb(err, res);
  });
};
