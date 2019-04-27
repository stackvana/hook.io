var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var appConfig = require('../../config');

var baseURL = config.baseUrl;
var sdk = require('hook.io-sdk');
var user = require('../../lib/resources/user');
user.persist(appConfig.couch);

var startDevCluster = require('../lib/helpers/startDevCluster');
var metric = require('../../lib/resources/metric');

var testUser = config.testUsers.david;

var client = sdk.createClient(testUser.hookSdk);

tap.test('start the dev cluster', function (t) {
  startDevCluster({
    flushRedis: true,
    flushTestUsers: true
  }, function (err, data) {
    t.pass('cluster started');
    var david = data.users.david;
    david.servicePlanMeta = {
      hits: 2,
      concurrency: 1
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

tap.test('attempt to create a new hook with delay - authorized api key', function (t) {
  client.hook.create({ 
    "name": "test-hook-rate-limits",
    "source": 'echo "hello";',
    "language": "bash"
  }, function (err, res) {
    t.error(err);
    t.equal(typeof res, "object");
    t.equal(res.status, "created");
    t.end();
  });
});

tap.test('attempt to run 3 hooks in a row', function (t) {
  t.plan(5);
  client.hook.run({ owner: "david", name: "test-hook-rate-limits", data: { "foo": "bar" } }, function (err, res) {
    t.error(err);
    client.hook.run({ owner: "david", name: "test-hook-rate-limits", data: { "foo": "bar" } }, function (err, res) {
      t.error(err);
      client.hook.run({ owner: "david", name: "test-hook-rate-limits", data: { "foo": "bar" } }, function (err, res) {
        t.error(err);
        t.equal(res.error, true);
        t.equal(res.message, 'Rate limited: Max monthly limit hit: 2');
      });
    });
  });
});

tap.test('attempt to delete the hook we just created - correct access key', function (t) {
  client.hook.destroy({ owner: 'david', name: 'test-hook-rate-limits' }, function (err, res) {
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
