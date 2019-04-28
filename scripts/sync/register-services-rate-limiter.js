/*
   This script will take all existing hooks from the couchdb and create
   new entries in the metrics provider in redis as '/metric/:owner/:name/report`
   
   Having this entry in the Redis is a requirement for services to be routable
   Normally this entry will be created when a service is saved or updated, however if the redis metrics are lost...
   Then running this script will be required to restore services
*/
var config = require('../../config');
var cache = require('../../lib/resources/cache');
var metric = require('../../lib/resources/metric');

var async = require('async');
var hook = require('../../lib/resources/hook');
var microcule = require('microcule');
var rateLimiter = new microcule.plugins.RateLimiter({
  provider: metric
});
hook.persist(config.couch);

// TODO: batch entry
var keys = [];

hook.all(function (err, results) {
  if (err) {
    throw err;
  }
  async.eachLimit(results, 80, updateHookCache, function (err, re){
    console.log('finished', err, re);
    process.exit();
  });
  function updateHookCache (_hook, cb) {
    console.log('updating hook', _hook.name);
    rateLimiter.registerService({ owner: _hook.owner, name: _hook.name }, cb);
  }
});