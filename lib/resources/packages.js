var packages = {};
module['exports'] = packages;

var config = require('../../config');
var request = require('request');
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

packages.setStatus = function add (status, pkg, cb) {
  // add entry to set
  client.hset("/packages/npm/" + status, pkg, "", function (err, res){
    if (err) {
      throw err;
    }
    return cb(err, res);
  });
};

packages.installed = function installed (pkg, cb) {
  client.hget("/packages/npm/installed", pkg, function (err, res){
    if (err) {
      throw err;
    }
    return cb(err, res);
  });
};

packages.install = function install (pkg, cb) {
  // first check if package exists on the public npm server through hpm.npm.exists
    // if it doesn't exist, continue with error
    // if it exists, that means we can install it via hpm.npm.install
    // call out to the hpm server to install the module
    // TODO: make a proper hpm node.js API client
    request({
      uri: "http://localhost:8888/npm/install",
      method: "POST",
      form: {
        packages: pkg,
        where: config.worker.npmPath
      }
    }, function (err, result, body) {
      return cb(err, body);
      // console.log(err, result.body);
    });
}
