/* simple caching resource that uses redis */
var config = require('../../config');

var redis = require("redis"),
    client = redis.createClient(config.redisCache.port, config.redisCache.host);

if (config.redisCache.password !== null) {
  client.auth(config.redisCache.password);
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

cache.sadd = function (key, value, cb) {
  client.sadd(key, JSON.stringify(value), function (err, result) {
    return cb(err, result);
  });
};

cache.srem = function (set, key, cb) {
  client.srem(set, JSON.stringify(key), function (err, result) {
    return cb(err, result);
  });
}

cache.smembers = function (key, cb) {
  client.smembers(key, function(err, results) {
    results = results.map(function(result){
      try {
        result = JSON.parse(result);
      } catch (err) {
        return cb(err);
      }
      return result;
    });
    return cb(err, results);
  });
};

cache.lrange = function (key, start, end, cb) {
  client.lrange(key, 0, -1, function(err, result){
    return cb(err, result);
  });
};

cache.lpush = function (key, value, cb) {
  client.lpush(key, JSON.stringify(value), function(err, result){
    return cb(err, result);
  });
};


module['exports'] = cache;