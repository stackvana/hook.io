var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');

var baseURL = config.baseUrl;
var sdk = require('hook.io-sdk');
var startDevCluster = require('../lib/helpers/startDevCluster');
var metric = require('../../lib/resources/metric');

var testUser = config.testUsers.david;

var client = sdk.createClient(testUser.hookSdk);

tap.test('start the dev cluster', function (t) {
  startDevCluster(config, function (err) {
    t.ok('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end('dev cluster started');
    }, 2000);
  });
});

// clear the usage limits for test user
tap.test('reset test user metrics', function (t) {
  t.ok('metrics reset');
  metric.zrem('running', 'david', function (err){
    t.error(err);
    metric.zrem('hits', 'david', function (err){
      t.error(err);
      t.ok(true, 'reset metrics for david')
      t.end();
    });
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

tap.test('attempt to run 4 hooks at once', function (t) {
  t.plan(6);
  // TODO: actually parse every response and ensure at least one contains concurrency error
  client.hook.run({ owner: "david", name: "test-hook-concurrency", data: { "foo": "bar" } }, function (err, res) {
    t.error(err);
  });
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
      t.equal(res.message, 'Rate limited: Max concurrency limit hit: 3')
    });
  }, 2000);
});

tap.test('attempt to delete the hook we just created - correct access key', function (t) {
  client.hook.destroy({ owner: 'david', name: 'test-hook-concurrency' }, function (err, res) {
    t.error(err);
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('cluster is shutting down');
  setTimeout(function(){
    process.exit();
  }, 10);
});
