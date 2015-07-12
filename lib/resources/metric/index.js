/* resource for keeping metrics on hooks and site usage using redis */

var metric = {};
var config = require('../../../config');

var redis = require("redis"),
    client = redis.createClient();

/*
client.flushall();
client.keys("*", function(err, res){
  console.log(err, res);
});
*/

// TODO: better error handling and client setup/teardown
client.on("error", function (err) {
    console.log("Error " + err);
});

metric.get = function (key, cb) {
  var _key = '/metric/' + key;
  client.get(_key, function(err, reply){
    return cb(err, reply);
  });
};

metric.set = function (key, data, cb) {
  client.set('/metric/' + key, JSON.stringify(data), function(err, result){
    return cb(err, result);
  });
};

metric.incr = function (key, value, cb) {
  client.incr('/metric/' + key);
};

module['exports'] = metric;