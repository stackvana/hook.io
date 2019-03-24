/* resource for keeping metrics on hooks and site usage using redis */
var metric = {};
var config = require('../../../config');

var redis = require("redis"),
    client = redis.createClient(config.redis.port, config.redis.host);

  if (config.redis.password !== null) {
    client.auth(config.redis.password);
  }

// TODO: better error handling and client setup/teardown
client.on("error", function (err) {
  console.log("Error " + err);
});

metric.keys = function (query, cb) {
  client.keys(query, cb);
};

metric.batchGet = function (keys, cb) {
  var _keys = [];
  var result = {};
  // keep metrics keyed into namespace ( so calling method does not need to know /metrics root )
  // this allows /metrics to be configurable in future
  _keys = keys.map(function(k){
    return '/metric' + k;
  })
  client.mget(_keys, function (err, reply) {
    // merge results back into object hash containing keys
    reply.forEach(function(k, i){
      result[keys[Object.keys(keys)[i]]] = JSON.parse(k);
    })
    return cb(err, result);
  });
};

metric.get = function (key, cb) {
  var _key = '/metric' + key;
  client.get(_key, function (err, reply){
    return cb(err, reply);
  });
};
metric.client = client;
metric.set = function (key, data, cb) {
  cb = cb || function () {};
  client.set('/metric' + key, JSON.stringify(data), function (err, result) {
    return cb(err, result);
  });
};

metric.zincrby = function (args, cb) {
  /*

    zset, member, value, member, value

    zset: the name of the sorted set we are storing
      metrics/running
      metrics/hits

    member: the name of the member in the set
      examples
      marak
      david

    value: the value to increment / set

  */
  client.zincrby(["metrics/" + args[0], args[1], args[2]], function (err, reply) {
    if (typeof cb === "function") {
      cb(err, reply);
    }
  })
};

metric.llen = function (zset, cb) {
  client.llen('metrics/' + zset, cb);
};

metric.zlexcount = function (zset, min, max, cb) {
  client.zlexcount(["metrics/" + zset, min, max], function (err, reply) {
    return cb(err, reply);
  });
};

metric.zrangebyscore = function (zset, min, max, cb) {
  client.zrangebyscore(["metrics/" + zset, min, max], function (err, reply) {
    return cb(err, reply);
  });
};

metric.zadd = function (zset, member, incr, cb) {
  client.zadd("metrics/" + zset, member, incr, function (err, reply) {
    return cb(err, reply);
  });
};

metric.zrem = function (zset, member, cb) {
  client.zrem("metrics/" + zset, member, function (err, reply) {
    return cb(err, reply);
  });
};

metric.incr = function (key) {
  // TODO: check string if /hits, only apply for that
  //client.incr('/metric/hook/totalHits');
  client.incr('/metric' + key);
};

metric.top = function (zset, cb) {
  var args = [ 'metrics/' + zset, '+inf', '-inf', 'WITHSCORES', 'LIMIT', 0, 100 ];
   client.zrevrangebyscore(args, function (err, response) {
     cb(err, response);
   });
};

metric.recent = function (zset, cb) {
  // go back for the past 24 hours
  let past = new Date().getTime() - 86400000;
  // past = new Date().getTime() - 60000;
  // let now = new Date().getTime();
  var args = [ 'metrics/' + zset, '+inf', past, 'WITHSCORES', 'LIMIT', 0, 100 ];
   client.zrevrangebyscore(args, function (err, response) {
     cb(err, response);
   });
};

metric.incrby = function (key, value) {
  // TODO: check string if /hits, only apply for that
  value = value || 1;
  // client.incrby('/metric/hook/totalHits', value);
  client.incrby('/metric' + key, value);
};

metric.hget = function (key, field, cb) {
  client.hget('/metric' + key, field, cb);
};

metric.hgetall = function (key, cb) {
  client.hgetall('/metric' + key, cb);
};

metric.hset = function (key, field, value, cb) {
  client.hset('/metric' + key, field, value, cb);
};

metric.hincrby = function (key, field, value, cb) {
  client.hincrby('/metric' + key, field, value, cb);
};

metric.resetRunningServicesCount = function (owner, cb) {
  client.zrem("metrics/running", owner, function (err, reply) {
    if (err) {
      return cb(err);
    }
    client.hset('/metric/' + owner + '/report', 'running', 0, cb);
  });
};

module['exports'] = metric;