var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var sdk = require('hook.io-sdk');
var startDevCluster = require('../lib/helpers/startDevCluster');

var startDevCluster = require('../lib/helpers/startDevCluster');

var testUser = config.testUsers.david;

/*
var _config = {};
_config.host = "localhost";
_config.port = 9999;
_config.protocol = 'http';
_config.accessKey = testUser.admin_key;
*/

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
  t.plan(4);
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
