// hook-api-test.js
var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');

var sdk = require('hook.io-sdk');

var testUser = config.testUsers.david;

var client = sdk.createClient(testUser.hookSdk);

tap.test('start the dev cluster', function (t) {
  startDevCluster({}, function (err) {
    t.ok('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end('dev cluster started');
    }, 1500);
  });
});

tap.test('attempt to get /docs', function (t) {
  r({ uri: baseURL + "/docs", method: "GET", json: true }, function (err, res) {
    t.error(err);
    t.end();
  });
});

tap.test('attempt to get /sdk', function (t) {
  r({ uri: baseURL + "/docs", method: "GET", json: true }, function (err, res) {
    t.error(err);
    t.end();
  });
});

tap.test('attempt to get /signup', function (t) {
  r({ uri: baseURL + "/docs", method: "GET", json: true }, function (err, res) {
    t.error(err);
    t.end();
  });
});

tap.test('attempt to get /roles', function (t) {
  r({ uri: baseURL + "/roles", method: "GET", json: true }, function (err, res) {
    t.error(err);
    t.end();
  });
});


tap.test('attempt to view blog', function (t) {
  r({ uri: baseURL + "/blog", method: "GET", json: true }, function (err, res) {
    t.error(err);
    t.end();
  });
});

tap.test('attempt to get  blog feed', function (t) {
  r({ uri: baseURL + "/blog/feed", method: "GET" }, function (err, res, body) {
    t.error(err);
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('shut down');
  setTimeout(function(){
    process.exit(0);
  }, 1500)
});