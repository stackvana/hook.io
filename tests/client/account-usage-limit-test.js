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
  startDevCluster({}, function (err) {
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

// create a few new hooks to test
tap.test('attempt to create a new hook with delay - authorized api key', function (t) {
  client.hook.create({ 
    "name": "test-hook-delay",
    "source": 'sleep 1;\necho "hello";',
    "language": "bash"
  }, function (err, res) {
    t.error(err);
    t.equal(typeof res, "object");
    t.equal(res.status, "created");
    t.end();
  });
});

tap.test('attempt to create a new hook that never ends - authorized api key', function (t) {
  var neverResponds = function (req, res) {
    console.log('does nothing');
  }
  client.hook.create({ 
    "name": "test-hook-never-responds",
    "source": 'module["exports"] = ' + neverResponds.toString(),
    "language": "javascript",
    "customTimeout": 4000
  }, function (err, res) {
    t.error(err);
    t.equal(typeof res, "object");
    t.equal(res.status, "created");
    t.end();
  });
});

tap.test('attempt to run delay hook once', function (t) {
  client.hook.run({ owner: "david", name: "test-hook-delay", data: { "foo": "bar" } }, function (err, res) {
    t.error(err);
    t.end();
  });
});

tap.test('check metrics for test user', function (t) {
  // TODO: use client.metrics, need to add to hook.io-sdk
  metric.zscore('running', 'david', function (err, result) {
    t.error(err);
    t.equal(result, "0");
    metric.zscore('hits', 'david', function (err, result) {
      t.equal(result, "1");
      t.error(err);
      t.end();
    });
  });
});

tap.test('attempt to run hook that never responds hook once', function (t) {
  t.plan(4);
  client.hook.run({ owner: "david", name: "test-hook-never-responds", data: { "foo": "bar" } }, function (err, body, res) {
    t.error(err);
    t.equal(res.statusCode, 500)
    t.end();
  });
  setTimeout(function(){
    metric.zscore('running', 'david', function (err, result) {
      t.error(err);
      t.equal(result, "1");
    });
  }, 500)
});

tap.test('check metrics for test user', function (t) {
  // TODO: use client.metrics, need to add to hook.io-sdk
  metric.zscore('running', 'david', function (err, result) {
    t.error(err);
    t.equal(result, "0");
    metric.zscore('hits', 'david', function (err, result) {
      t.equal(result, "2");
      t.error(err);
      t.end();
    });
  });
});

tap.test('attempt to delete test hooks - correct access key', function (t) {
  client.hook.destroy({ owner: 'david', name: 'test-hook-delay' }, function (err, res) {
    t.error(err);
    client.hook.destroy({ owner: 'david', name: 'test-hook-never-responds' }, function (err, res) {
      t.error(err);
      t.end();
    });
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('cluster is shutting down');
  setTimeout(function(){
    process.exit();
  }, 10);
});