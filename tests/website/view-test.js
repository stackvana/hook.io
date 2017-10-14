// hook-api-test.js
var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');
var async = require('async');
var sdk = require('hook.io-sdk');

var testUser = config.testUsers.david;

var client = sdk.createClient(testUser.hookSdk);

var webServer;
var allPageKeys;

tap.test('start the dev cluster', function (t) {
  startDevCluster({}, function (err, servers) {
    t.error(err)
    webServer = servers['web'];
    allPageKeys = Object.keys(webServer.view.views);
    t.ok('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end('dev cluster started');
    }, 1500);
  });
});

// attempt to get all pages as JSON
// TODO: smoke test with valid auth
// TODO: check text/html response in additional to json response, make sure formats / headers are set
tap.test('attempt to get /docs', function (t) {
  var callbacks = 0;
  // t.plan(allPageKeys.length * 2);
  async.eachSeries(allPageKeys, function iter (item, next){
    r({ uri: baseURL + "/" + item, method: "GET", json: true }, function (err, res) {
      t.error(err);
      t.ok('did not error back', item)
      next();
    });
  }, function end (){
    t.end();
  })
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('shut down');
  setTimeout(function(){
    process.exit(0);
  }, 1500)
});