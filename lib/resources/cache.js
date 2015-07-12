/* simple caching resource that uses redis */
var redis = require("redis"),
    client = redis.createClient();

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

module['exports'] = cache;