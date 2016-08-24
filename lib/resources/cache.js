/* simple caching resource that uses redis */
var config = require('../../config');

var redis = require("redis"),
    client = redis.createClient(config.redis.port, config.redis.host);

if (config.redis.password !== null) {
  client.auth(config.redis.password);
}

// TODO: better error handling and client setup/teardown
client.on("error", function (err) {
    console.log("Error " + err);
});

var cache = {};

cache._store = {};
var store = cache._store;

cache.get = function (key, cb) {
  // TODO: consider HMSET / HMGET and not using  of serialization here
  client.get(key, function(err, reply){
    if (reply !== null) {
      reply = JSON.parse(reply);
    }
    return cb(err, reply);
  });
};

cache.set = function (key, data, cb) {
  // TODO: consider HMSET instead of seralization here
  client.set(key, JSON.stringify(data), function(err, result){
    return cb(err, result);
  });
};

cache.del = function (key, cb) {
  client.del(key, function(err, result){
    return cb(err, result);
  });
};

module['exports'] = cache;