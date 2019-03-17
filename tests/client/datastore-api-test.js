var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');

var testUser = config.testUsers.david;

/*
tap.test('attempt to set datastore document without any auth ( anonymous root )', function (t) {
  r({ uri: baseURL + "/datastore/set", method: "POST", json: { key: "testKey", value: "hello"} }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res, "OK", "was able to set document in anonymous root");
    t.end();
  });
});

tap.test('attempt to get datastore document we just created without any auth ( anonymous root )', function (t) {
  r({ uri: baseURL + "/datastore/get", method: "POST", json: { key: "testKey" } }, function (err, echo) {
    t.error(err, 'request did not error');
    t.equal(echo, "hello");
    t.end();
  });
});
*/

tap.test('start the dev cluster', function (t) {
  startDevCluster({
    flushRedis: true
  }, function (err) {
    t.pass('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end();
    }, 1500);
  });
});

tap.test('attempt to set datastore document for bobby with "admin-access-key" role - invalid key', function (t) {
  r({ uri: baseURL + "/datastore/set", method: "POST", json: { hook_private_key: "wrong_key", key: "testKey", value: "hello"} }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res.error, true, "response contains error");
    t.equal(res.type, "unauthorized-role-access", "has correct error type");
    t.end();
  });
});

// TODO: better format of returned keys
tap.test('attempt to set datastore document for bobby with "admin-access-key" role - correct key', function (t) {
  r({ uri: baseURL + "/datastore/set", method: "POST", json: { hook_private_key: testUser.admin_key, key: "another-key", value: "hello"} }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res, "OK", "returned okay");
    t.end();
  });
});

tap.test('attempt to get datastore document for bobby with "admin-access-key" role - invalid key', function (t) {
  r({ uri: baseURL + "/datastore/get", method: "POST", json: { hook_private_key: "wrong_key", key: "another-key", value: "hello"} }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res.error, true, "response contains error");
    t.equal(res.type, "unauthorized-role-access", "has correct error type");
    t.end();
  });
});

tap.test('attempt to get datastore document for bobby with "admin-access-key" role - correct key', function (t) {
  r({ uri: baseURL + "/datastore/get", method: "POST", json: { hook_private_key: testUser.admin_key, key: "another-key", value: "hello"} }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(typeof res, "string", "returned string");
    t.equal(res, "hello", "returned correct value");
    t.end();
  });
});

tap.test('attempt to get recent datastore entries for bobby with "admin-access-key" role - correct key', function (t) {
  r({ uri: baseURL + "/datastore/recent", method: "GET", headers: { "hookio-private-key": testUser.admin_key } , json: { key: "another-key", value: "hello"} }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res instanceof Array, true, "returned array");
    t.equal(res.length > 0, true, "array has items");
    t.end();
  });
});

tap.test('attempt to del datastore document for bobby with "admin-access-key" role - invalid key', function (t) {
  r({ uri: baseURL + "/datastore/del", method: "POST", json: { hook_private_key: "wrong_key", key: "another-key", value: "hello"} }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res.error, true, "response contains error");
    t.equal(res.type, "unauthorized-role-access", "has correct error type");
    t.end();
  });
});

tap.test('attempt to del datastore document for bobby with "admin-access-key" role - correct key', function (t) {
  r({ uri: baseURL + "/datastore/del", method: "POST", json: { hook_private_key: testUser.admin_key, key: "another-key" } }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res, 1, "returned 1");
    t.end();
  });
});

tap.test('attempt to get deleted datastore document for bobby with "admin-access-key" role - correct key', function (t) {
  r({ uri: baseURL + "/datastore/get", method: "POST", json: { hook_private_key: testUser.admin_key, key: "another-key"} }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res, null, "returned null");
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  setTimeout(function(){
    process.exit();
  }, 10);
  t.end();
});
// TODO: make test to ensure no cross-contamination of datastore access