var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');

// david is a pre-generated user 
//var testUser = config.testUsers.bobby;

// hook-api-test.js
var tap = require("tape");
var r = require('../lib/helpers/_request');
var baseURL = config.baseUrl;

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

var sdk = require('hook.io-sdk');

var testUser = config.testUsers.david;

var client = sdk.createClient(testUser.hookSdk);

//
// Basic hook API tests
//

tap.test('attempt to create a new public hook', function (t) {
  client.hook.create({
    "name": "test-public-hook",
    "source": 'module["exports"] = function (h) {console.log("logging");console.log(h.params);h.res.end("ended");}',
    "language": "javascript"
  }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res.status, 'created', 'created public hook');
    t.end();
  });
});

// TODO: add some tests using hook.io-sdk
tap.test('attempt to view logs for newly created hook - anonymous access', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-public-hook/logs", method: "GET", json: true }, function (err, res) {
    t.error(err);
    t.equal(typeof res, "object", "returned json object");
    t.equal(res.length, 0, "found no log entries");
    t.end();
  });
});

tap.test('attempt to run the public hook - anonymous access', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-public-hook?foo=bar", method: "GET" }, function (err, res) {
    t.error(err);
    t.equal(res, 'ended\n', 'returned correct result');
    t.end();
  });
});

tap.test('attempt to view logs for newly created hook - anonymous access', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-public-hook/logs", method: "GET", json: true }, function (err, res) {
    t.error(err);
    t.equal(typeof res, "object", "returned json object");
    t.equal(res.length, 2, "found two log entries");
    t.equal(typeof res[0].data, 'object', 'found log entry as object');
    t.equal(res[0].data.foo, 'bar', 'found correct param');
    t.equal(res[1].data, 'logging', 'found exact match of log entry as string');
    t.end();
  });
});

tap.test('attempt to flush logs for the hook we just created a new hook - correct access key', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-public-hook/logs?flush=true", method: "POST", json: { hook_private_key: testUser.admin_key } }, function (err, res) {
    t.error(err);
    t.equal(res, 1, "flushed logs");
    t.end();
  });
});

// destroy the hook
tap.test('attempt to destroy the public hook', function (t) {
  client.hook.destroy({
    "owner": testUser.name,
    "name": "test-public-hook"
  }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res.status, 'deleted', 'created public hook');
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('cluster is shutting down');
  setTimeout(function(){
    process.exit();
  }, 10);
});