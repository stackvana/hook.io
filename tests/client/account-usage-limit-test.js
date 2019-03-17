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
    t.pass('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end();
    }, 2000);
  });
});

// clear the usage limits for test user
tap.test('reset test user metrics', function (t) {
  t.pass('cluster started');('metrics reset');
  metric.client.del('/metric/david/report', function (err){
    t.error(err);
    t.pass('cluster started');
    t.end();
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
  metric.hgetall('/david/report', function (err, report){
    t.error(err);
    t.equal(typeof report, 'object', 'found reporting object');
    t.equal(report.running, "0");
    t.equal(report.totalHits, "1");
    t.end();
  })
});

tap.test('attempt to run hook that never responds hook once', function (t) {
  t.plan(5);
  client.hook.run({ owner: "david", name: "test-hook-never-responds", data: { "foo": "bar" } }, function (err, body, res) {
    t.error(err);
    // t.equal(res.statusCode, 500)
    t.equal(res.statusCode, 200)
    //t.end();
  });
  setTimeout(function(){
    metric.hgetall('/david/report', function (err, report){
      t.error(err);
      t.equal(typeof report, 'object', 'found reporting object');
      t.equal(report.running, "1");
      //t.end();
    });
  }, 500)
});

tap.test('check metrics for test user', function (t) {
  // TODO: use client.metrics, need to add to hook.io-sdk
  metric.hgetall('/david/report', function (err, report){
    t.error(err);
    t.equal(typeof report, 'object', 'found reporting object');
    t.equal(report.running, "0", "found no running hooks");
    t.equal(report.totalHits, "2", "found two total hits");
    t.end();
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
  t.end();
  setTimeout(function(){
    process.exit();
  }, 10);
});