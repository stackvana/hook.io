var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');

// david is a pre-generated user 
var testUser = config.testUsers.david;

var freeUser = {
  name: "bobby-free"
};

var sdk = require('hook.io-sdk');

var testUser = config.testUsers.david;
var bobby = config.testUsers.bobby;
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

// TODO: paid account features

tap.test('attempt to create a new hook without any auth ( anonymous root )', function (t) {
  r({ uri: baseURL + "/new", method: "POST", json: { 
      name: "test-hook"
    } }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res.error, true, "unauthorized role access caused error");
    t.equal(res.type, "unauthorized-role-access", "has correct error type");
    t.equal(res.role, "hook::create", "has correct role type");
    t.end();
  });
});

tap.test('attempt to create a new hook with missing name - authorized api key', function (t) {
  r({ uri: baseURL + "/new", method: "POST", json: { hook_private_key: testUser.admin_key } }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res.error, true, "response contains error");
    t.equal(res.property, "name", "error with name property");
    t.equal(res.required, true, "is required");
    t.end();
  });
});



/*
// TODO: more test users / better test user creation / teardown
tap.test('attempt to create a new private hook - authorized api key - free account', function (t) {
  r({ uri: baseURL + "/new", method: "POST", json: { 
      name: "test-private-hook", 
      hook_private_key: testUser.admin_key,
      isPrivate: true,
      language: "ruby",
      source: 'puts "hello"',
      hookSource: "code"
    }}, function (err, res) {
    t.error(err);
    t.equal(res.error, true, "return error");
    t.equal(res.type, "paid-account-required", "no error type");
    t.equal(typeof res.message, "string", "return string error message");
    t.end();
  });
});
*/

tap.test('attempt to create a new private hook - authorized api key - paid account', function (t) {
  client.hook.create({
    "name": "test-private-hook",
    "code": 'puts "hello"',
    "language": "ruby",
    "isPrivate": true
  }, function (err, res){
    t.error(err);
    t.equal(typeof res, "object");
    t.equal(res.status, "created");
    t.end();
  });
});

tap.test('attempt to run the private hook - anonymous access', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-private-hook", method: "GET" }, function (err, res) {
    t.error(err);
    res = res || {};
    t.equal(res.error, true, "unauthorized role access caused error");
    t.equal(res.type, "unauthorized-role-access", "has correct error type");
    t.end();
  });
});

tap.test('attempt to run the private hook - admin access', function (t) {
  client.hook.run({ owner: 'david', name: 'test-private-hook' }, function (err, res){
    t.error(err);
    t.equal(res, "hello\n", "hook ran");
    t.end();
  });
});

tap.test('attempt to run the private hook - run-only access', function (t) {
  var c = sdk.createClient({
    host: testUser.hookSdk.host,
    port: testUser.hookSdk.port,
    protocol: testUser.hookSdk.protocol,
    hook_private_key: testUser.run_key
  });
  c.hook.run({ owner: 'david', name: 'test-private-hook' }, function (err, res){
    t.error(err);
    t.equal(res, "hello\n", "hook ran");
    t.end();
  });
});

tap.test('attempt to run the private hook - run-only access - other users valid key', function (t) {
  var c = sdk.createClient({
    host: testUser.hookSdk.host,
    port: testUser.hookSdk.port,
    protocol: testUser.hookSdk.protocol,
    hook_private_key: bobby.run_key
  });
  c.hook.run({ owner: 'david', name: 'test-private-hook' }, function (err, res) {
    t.error(err);
    t.equal(res.error, true, "unauthorized role access caused error");
    t.equal(res.type, "unauthorized-role-access", "has correct error type");
    t.end();
  });
});

tap.test('attempt to run the private hook - run access - http header key', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-private-hook", method: "GET", headers: { "hookio-private-key": testUser.run_key } }, function (err, res) {
    t.error(err);
    t.equal(res, 'hello\n', 'returned correct result');
    t.end();
  });
});


tap.test('attempt to delete the hook we just created - correct access key', function (t) {
  client.hook.destroy({ owner: 'david', name: 'test-private-hook' }, function (err, res){
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

return;


tap.test('attempt to run the private hook - read-only access', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-private-hook", method: "POST", json: { hook_private_key: testUser.read_only }}, function (err, res) {
    t.error(err);
    res = res || {};
    t.equal(res.error, true, "unauthorized role access caused error");
    t.equal(res.type, "unauthorized-role-access", "has correct error type");
    t.end();
  });
});

/*
tap.test('attempt to flush logs for the hook we just created a new hook - correct access key', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-private-hook/logs?flush=true", method: "POST", json: { hook_private_key: testUser.admin_key } }, function (err, res) {
    t.error(err);
    t.equal(res, 1, "flushed logs");
    t.end();
  });
});
*/

tap.test('attempt to delete the hook we just created - anonymous access', function (t) {
  r({ uri: baseURL + "/" + testUser.name + "/" + "test-private-hook/delete", method: "GET", json: true }, function (err, res) {
    t.error(err);
    t.equal(res.error, true, "unauthorized role access caused error");
    t.equal(res.type, "unauthorized-role-access", "has correct error type");
    t.equal(res.role, "hook::destroy", "has correct role type");
    t.equal(res.user, "anonymous", "has correct session");
    t.end();
  });
});

tap.test('attempt to delete the hook we just created - correct access key', function (t) {
  client.hook.destroy({ owner: 'david', name: 'test-private-hook' }, function (err, res){
    t.error(err);
    t.end();
  });
});

