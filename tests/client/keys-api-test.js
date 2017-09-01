var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');

// bobby is a pre-generated user 
var testUser = config.testUsers.david;

var freeUser = {
  name: "bobby-free"
};

var sdk = require('hook.io-sdk');

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

var client = sdk.createClient(testUser.hookSdk);

// TOOD: update with hook.io-sdk
tap.test('attempt to get keys - invalid access key', function (t) {
  r({ uri: baseURL + "/keys/checkAccess", method: "POST", json: { 
      hook_private_key: "invalid-key",
      role: "hook::run"
    }}, function (err, res) {
      t.error(err, 'request did not error');
      //t.equal(res.error, true, "unauthorized role access caused error");
      //t.equal(res.type, "unauthorized-role-access", "has correct error type");
      //t.equal(res.role, "hook::create", "has correct role type");
      t.equal(res.hasAccess, false, "has correct role type");
      t.end();
  });
});

tap.test('attempt to get keys - valid access key', function (t) {
  r({ uri: baseURL + "/keys/checkAccess", method: "POST", json: {
      hook_private_key: testUser.admin_key,
      role: "hook::run"
    }}, function (err, res) {
      t.error(err, 'request did not error');
      //t.equal(res.error, true, "unauthorized role access caused error");
      //t.equal(res.type, "unauthorized-role-access", "has correct error type");
      //t.equal(res.role, "hook::create", "has correct role type");
      t.equal(res.hasAccess, true, "has correct role type");
      t.end();
  });
});

tap.test('attempt to create a new key with required properties - authorized api key', function (t) {
  client.keys.create({ name: 'test-access-key', owner: 'david', roles: "hook::run" }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res.name, 'test-access-key', 'has correct name');
    t.equal(res.roles, 'hook::run', 'has correct roles');
    t.end();
  });
});

tap.test('attempt to destroy test key', function (t) {
  client.keys.destroy({ name: 'test-access-key', owner: 'david' }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res.status, 'deleted', 'returned deleted status');
    //t.equal(res.error, true, "unauthorized role access caused error");
    //t.equal(res.type, "unauthorized-role-access", "has correct error type");
    //t.equal(res.role, "hook::create", "has correct role type");
    //t.equal(res.hasAccess, false, "has correct role type");
    t.end();
  });
});

tap.test('attempt to get keys ( anonymous )', function (t) {
  r({ uri: baseURL + "/keys", method: "GET", json: {
      owner: "bobby"
    }}, function (err, res) {
      t.error(err, 'request did not error');
      t.equal(res.error, true);
      // TODO: possible issue here with non-unified API response
      //t.equal(res.status, 'error', "response contains error");
      //t.equal(res.error, true, "unauthorized role access caused error");
      //t.equal(res.type, "unauthorized-role-access", "has correct error type");
      //t.equal(res.role, "keys::read", "has correct role type");
      //t.equal(res.status, "autodocs", "has correct role type");
      t.end();
  });
});

tap.test('attempt to create a new key with missing name - authorized api key', function (t) {
  r({ uri: baseURL + "/keys", method: "POST", json: {
      hook_private_key: testUser.keys_admin,
    }}, function (err, res) {
    //t.equal(res.status, "autodocs", "has correct role type");
    t.error(err, 'request did not error');
    // TODO: possible issue here with non-unified API response
    t.equal(res.error, true);
    //t.equal(res.status, 'error', "response contains error");
    //t.equal(typeof res.errors, 'object', "response contains errors array");
    //t.equal(res.property, "name", "error with name property");
    //t.equal(res.required, true, "is required");
    t.end();
  });
});

tap.test('attempt to create a new key with requires properties - authorized api key', function (t) {
  r({ uri: baseURL + "/keys", method: "POST", json: {
      hook_private_key: testUser.keys_admin,
      name: "test-access-key",
      owner: "bobby",
      roles: "hook::run"
    }}, function (err, res) {
    //t.equal(res.status, "autodocs", "has correct role type");
    t.error(err, 'request did not error');
    t.equal(res.error, true);
    //t.equal(res.status, 'error', "does not contain errors");
    //t.equal(typeof res.errors, 'object', "response contains errors array");
    //t.equal(res.property, "name", "error with name property");
    //t.equal(res.required, true, "is required");
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('cluster is shutting down');
  setTimeout(function(){
    process.exit();
  }, 10);
});