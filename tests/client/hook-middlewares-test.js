// hook-middlewares-test.js
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
    }, 2000);
  });
});

//
// Basic hook API tests
//

// destroy the hook
tap.test('attempt to destroy the test hook', function (t) {
  client.hook.destroy({ owner: 'david', name: 'test-hook' }, function (err, res){
    t.error(err, 'request did not error');
    t.end();
  });
});

// create a hook
tap.test('attempt to create a new hook with inputs', function (t) {
  client.hook.create({ 
    "name": "test-hook",
    "source": 'echo "hello";',
    "language": "bash",
    "inputs": ['examples/basic-auth'],
  }, function (err, res){
    t.error(err, 'request did not error');
    t.equal(res.status, 'created', 'returned correct name');
    t.equal(typeof res.hook, 'object', 'returned hook object');
    t.equal(res.hook.name, 'test-hook', 'returned correct name');
    t.end();
  });
});

// get the hook
tap.test('attempt to get the test hook', function (t) {
  client.hook.get({ owner: 'david', name: 'test-hook' }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(res.name, "test-hook");
    t.equal(res.source, 'echo "hello";');
    t.end();
  });
});

// run the hook without required middleware authorization
tap.test('attempt to run the test hook without middleware authorization', function (t) {
  client.hook.run({ owner: 'david', name: 'test-hook' }, function (err, res){
    t.error(err, 'request did not error');
    t.equal(res, "Access denied\n");
    t.end();
  });
});

// run the hook
tap.test('attempt to run the test hook', function (t) {
  var headers = {};
  headers['Authorization'] = "Basic " + new Buffer('admin' + ":" + 'password', "utf8").toString("base64");
  client.hook.run({ owner: 'david', name: 'test-hook', headers: headers }, function (err, res){
    t.error(err, 'request did not error');
    t.equal(res, "hello\n");
    t.end();
  });
});

/*
// update the hook
tap.test('attempt to update the test hook', function (t) {
  client.hook.update({ owner: 'david', name: 'test-hook', source: 'echo "updated";' }, function (err, res) {
    t.equal(res.status, 'updated', 'returned correct name');
    t.equal(typeof res.hook, 'object', 'returned hook object');
    t.error(err, 'request did not error');
    t.end();
  });
});

// get the updated hook
tap.test('attempt to get the test hook', function (t) {
  client.hook.get({ owner: 'david', name: 'test-hook' }, function (err, res){
    t.error(err, 'request did not error');
    t.equal(res.name, "test-hook", "name matches");
    t.equal(res.source, 'echo "updated";', "code matches");
    t.end();
  });
});

// run the updated hook
tap.test('attempt to run the test hook', function (t) {
  client.hook.run({ owner: 'david', name: 'test-hook' }, function (err, res){
    t.error(err, 'request did not error');
    t.equal(res, "updated\n");
    t.end();
  });
});

*/

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('cluster is shutting down');
  setTimeout(function(){
    process.exit();
  }, 10);
});
