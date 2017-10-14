// hook-api-test.js
var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');

var sdk = require('hook.io-sdk');

var testUser = config.testUsers.bobby;

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

var anonClient = sdk.createClient(config.hookApi); // no accessKey
var client = sdk.createClient(testUser.hookSdk);

//
// gateway tests for executing hot code against the /gateway API endpoint
// the gateway is used for running code without having to create a hook service

// exec a simple bash service as anonymous user
tap.test('attempt to exec a simple bash service as anonymous user', function (t) {
  anonClient.hook.exec({ "code": 'echo "hello"', "language": "bash", "data":  { "foo": "bar" } }, function (err, res) {
    console.log(err, res);
    t.error(err, 'request did not error');
    t.equal(res, "hello\n");
    t.end();
  });
});

// exec bash service as logged in user
tap.test('attempt to exec a simple bash service as registered user', function (t) {
  client.hook.exec({ "code": 'echo "hello"', "language": "bash", "data":  { "foo": "bar" } }, function (err, res) {
    console.log(err, res);
    t.error(err, 'request did not error');
    t.equal(res, "hello\n");
    t.end();
  });
});

// exec a bash service with a simple type of error
tap.test('attempt to exec a bash service with a simple type of error', function (t) {
  client.hook.exec({ "code": 'asd', "language": "bash", "data":  { "foo": "bar" } }, function (err, res) {
    console.log(err, res);
    t.error(err, 'request did not error');
    t.end();
  });
});

// exec a js service which echos some important info
tap.test('attempt to exec a js service which echos some important info', function (t) {
  var echoService = function (h) {
    var rsp = {};
    //rsp.owner = h.resource.owner;
    //rsp.name = h.resource.name;
    rsp.params = h.params;
    rsp.env = h.env;
    h.res.json(rsp);
  };
  client.hook.exec({
    "code": 'module.exports = ' + echoService.toString(),
    "language": "javascript",
    "data":  { "foo": "bar" }
  }, function (err, res) {
    t.error(err, 'request did not error');
    //t.equal(res.name, "gateway");
    //t.equal(res.owner, "david");
    t.equal(typeof res.params, "object");
    t.equal(res.params.foo, "bar");
    t.equal(typeof res.env, "object");
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('cluster is shutting down');
  setTimeout(function(){
    process.exit();
  }, 10);
});