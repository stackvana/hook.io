var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var appConfig = require('../../config');
var async = require('async');
var resource = require('resource');
var baseURL = config.baseUrl;
var sdk = require('hook.io-sdk');
var startDevCluster = require('../lib/helpers/startDevCluster');
var metric = require('../../lib/resources/metric');
var alerts = require('../../lib/resources/alerts/alerts');
var user = require('../../lib/resources/user');
user.persist(appConfig.couch);

var testUser = config.testUsers.david;

config.flushRedis = true;
config.flushTestUsers = true;

alerts.persist(config.couch);

var client = sdk.createClient(testUser.hookSdk);

tap.test('start the dev cluster', function (t) {
  startDevCluster(config, function (err, data) {
    t.pass('cluster started');
    var david = data.users.david;
    david.servicePlanMeta = {
      hits: 10,
      concurrency: 2
    };
    user.update(david, function(){
      // should not require a timeout, probably issue with one of the services starting
      // this isn't a problem in production since these services are intended to start independant of each other
      setTimeout(function(){
        t.end();
      }, 2000);
    });
  });
});

// clear the usage limits for test user
tap.test('reset test user metrics', function (t) {
  t.pass('cluster started');
  metric.zrem('running', 'david', function (err){
    t.error(err);
    metric.zrem('hits', 'david', function (err){
      t.error(err);
      t.pass('cluster started');
      t.end();
    });
  });
});

tap.test('attempt to clear all david alerts in system', function (t) {
  alerts.find({ username: 'david' }, function (err, results) {
    async.map(results, function(item, cb){
      item.destroy(cb);
    }, function(err, results){
      t.end();
    })
  });
});

/*

    HOOK CONCURRENCY LIMIT TESTS

*/
// create new hook with 2 second timer
tap.test('attempt to create a new hook with delay - authorized api key', function (t) {
  client.hook.create({ 
    "name": "test-hook-concurrency",
    "source": 'sleep 5;\necho "hello";',
    "language": "bash"
  }, function (err, res) {
    t.error(err);
    t.equal(typeof res, "object");
    t.equal(res.status, "created");
    t.end();
  });
});

tap.test('attempt to run 3 hooks at once', function (t) {
  t.plan(10);
  resource.on('usage::ratelimit', function (data){
    t.equal(data.code, 'RATE_CONCURRENCY_EXCEEDED');
    t.equal(data.maxConcurrency, 2);
    t.equal(data.username, 'david');
    t.equal(data.email, 'david@marak.com');
    t.equal(data.servicePlan, 'trial');
  });
  // TODO: actually parse every response and ensure at least one contains concurrency error
  client.hook.run({ owner: "david", name: "test-hook-concurrency", data: { "foo": "bar" } }, function (err, res) {
    t.error(err);
  });
  client.hook.run({ owner: "david", name: "test-hook-concurrency", data: { "foo": "bar" } }, function (err, res) {
    t.error(err);
  });
  setTimeout(function(){
    client.hook.run({ owner: "david", name: "test-hook-concurrency", data: { "foo": "bar" } }, function (err, res) {
      t.error(err);
      t.equal(res.error, true)
      t.equal(res.message, 'Rate limited: Max concurrency limit hit: 2')
    });
  }, 2000);
});

tap.test('check that an alert was created for RATE_CONCURRENCY_EXCEEDED', function (t) {
  // wait a few seconds for async alert to save
  setTimeout(function(){
    alerts.find({ username: 'david' }, function (err, results) {
      t.error(err);
      t.equal(results.length, 1);
      t.equal(results[0].status, 'silent');
      t.equal(results[0].code, 'RATE_CONCURRENCY_EXCEEDED');
      t.end();
    });
  }, 1000);
});


tap.test('attempt to delete the hook we just created - correct access key', function (t) {
  client.hook.destroy({ owner: 'david', name: 'test-hook-concurrency' }, function (err, res) {
    t.error(err);
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end();
  setTimeout(function(){
    process.exit();
  }, 10);
});
