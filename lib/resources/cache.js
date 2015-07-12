/* simple caching resource */

// TODO: store cache somewhere else besides memory


var redis = require("redis"),
    client = redis.createClient();

  // if you'd like to select database 3, instead of 0 (default), call
  // client.select(3, function() { /* ... */ });

  client.on("error", function (err) {
      console.log("Error " + err);
  });

  client.keys("*", function(err, reply){
    console.log(err, reply)
  })
  /*
  client.set("string key", "string val", redis.print);
  client.hset("hash key", "hashtest 1", "some value", redis.print);
  client.hset(["hash key", "hashtest 2", "some other value"], redis.print);
  client.hkeys("hash key", function (err, replies) {
      console.log(replies.length + " replies:");
      replies.forEach(function (reply, i) {
          console.log("    " + i + ": " + reply);
      });
      client.quit();
  });
  */

  client.FLUSHALL();
var cache = {};

cache._store = {};
var store = cache._store;

cache.get = function (key, cb) {
  client.get(key, function(err, reply){
    console.log('got from cache', reply)
    if (reply !== null) {
      reply = JSON.parse(reply);
    }
    return cb(err, reply);
  });
};

cache.set = function (key, data, cb) {
  console.log('attempting to set key', key, data)
  client.set(key, JSON.stringify(data), function(err, result){
    console.log('setted?', err, result)
    return cb(err, result);
  });
};

cache.del = function (key, data) {
  console.log(store)
  console.log('attempting deleting from cache', key);
  if (typeof store[key] !== 'undefined') {
    console.log('deleting from cache', key);
    store[key] = null;
  }
  if (typeof data !== 'undefined') {
    store[key] = data;
  }
}

module['exports'] = cache;