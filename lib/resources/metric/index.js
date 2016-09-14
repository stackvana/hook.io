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
  client.mget(_keys, function (err, reply){
    // merge results back into object hash containing keys
    reply.forEach(function(k, i){
      result[keys[Object.keys(keys)[i]]] = k;
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
  client.set('/metric' + key, data, function(err, result){
    return cb(err, result);
  });
};

metric.all = function (owner, service, cb) {
  var metrics = [
    '/' + owner + "/hits",
    '/' + owner + "/totalHits",
    '/' + owner + "/gateway/hits",
    '/' + owner + "/running",
    '/' + owner + "/" + service + "/hits",
    '/' + owner + "/" + service + "/running"
  ];
  metric.batchGet(metrics, function(err, results){
    cb(err, results);
  })
};

metric.incr = function (key) {
  // TODO: check string if /hits, only apply for that
  client.incr('/metric/hook/totalHits');
  client.incr('/metric' + key);
};

metric.incrby = function (key, value) {
  // TODO: check string if /hits, only apply for that
  value = value || 1;
  client.incrby('/metric/hook/totalHits', value);
  client.incrby('/metric' + key, value);
};

module['exports'] = metric;