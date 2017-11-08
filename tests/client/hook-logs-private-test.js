var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');
var sdk = require('hook.io-sdk');

tap.test('empty suite', function (t) {
  t.ok('no tests');
  t.end('pass');
})

// david is a pre-generated user 
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

// private hooks / secure logs
tap.test('attempt to create a new private hook - authorized api key', function (t) {
  
  client.hook.create({ 
    "name": "test-private-hook",
    "language": "javascript",
    "source": 'module["exports"] = function (h) {console.log("logging");h.res.end("ended");}',
    "isPrivate": true
  }, function (err, res){
    t.error(err, 'request did not error');
    t.equal(res.status, 'created', 'returned correct name');
    t.equal(typeof res.hook, 'object', 'returned hook object');
    // t.equal(res.hook.name, 'test-hook-view', 'returned correct name');
    t.end();
  });

});

// TODO: generate more test keys
/*
tap.test('attempt to view logs for newly created hook - read only access', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-private-hook/logs", method: "POST", json: { hook_private_key: testUser.read_only } }, function (err, res) {
    t.error(err);
    console.log(err, res)
    t.equal(typeof res, "object", "returned json object");
    t.equal(res.length, 0, "found no log entries");
    t.end();
  });
});

*/

tap.test('attempt to view logs for newly created hook - anonymous access', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-private-hook/logs", method: "GET", json: true }, function (err, res) {
    t.error(err, 'did not error');
    t.equal(res.error, true, "unauthorized role access caused error");
    t.equal(res.type, "unauthorized-role-access", "has correct error type");
    t.end();
  });
});

tap.test('attempt to run the private hook - run access', function (t) {
  client.hook.run({ owner: testUser.name, name: 'test-private-hook'}, function (err, res){
    t.error(err);
    t.equal(res, 'ended\n', 'returned correct result');
    t.end();
  });
});

// TODO: generate more test keys
/*

tap.test('attempt to view logs for newly created hook - read access', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-private-hook/logs", method: "POST", json: { hook_private_key: testUser.read_only } }, function (err, res) {
    t.error(err);
    t.equal(typeof res, "object", "returned json object");
    t.equal(res.length, 1, "found one log entry");
    t.end();
  });
});

*/
tap.test('attempt to flush logs for the hook we just created a new hook - correct access key', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-private-hook/logs?flush=true", method: "POST", json: { hook_private_key: testUser.admin_key } }, function (err, res) {
    t.error(err);
    t.equal(res, 1, "flushed logs");
    t.end();
  });
});

tap.test('attempt to delete the hook we just created a new hook - correct access key', function (t) {
  client.hook.destroy({ owner: 'david', name: 'test-private-hook' }, function (err, res){
    t.error(err);
    t.equal(res.status, "deleted", "has correct status");
    t.equal(res.owner, testUser.name, "has correct owner");
    t.equal(res.name, "test-private-hook", "has correct name");
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('cluster is shutting down');
  setTimeout(function(){
    process.exit();
  }, 10);
});
