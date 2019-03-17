var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');

// hook-api-test.js
var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;

var sdk = require('hook.io-sdk');
var testUser = config.testUsers.david;
var client = sdk.createClient(testUser.hookSdk);

tap.test('start the dev cluster', function (t) {
  startDevCluster({}, function (err, servers) {
    t.pass('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end();
    }, 2000);
  });
});

//
// Basic hook API tests
//

// destroy the hook
tap.test('attempt to destroy the test view hook', function (t) {
  client.hook.destroy({ owner: 'david', name: 'test-hook-view' }, function (err, res){
    t.error(err, 'request did not error');
    t.end();
  });
});

// create a hook
tap.test('attempt to create a new hook', function (t) {
  client.hook.create({ 
    "name": "test-hook-view",
    "source": 'echo "Hello";',
    "language": "bash",
    "view": "<h1>{{hook.output}}</h1>",
    "themeStatus": "enabled"
  }, function (err, res){
    t.error(err, 'request did not error');
    t.equal(res.status, 'created', 'returned correct name');
    t.equal(typeof res.hook, 'object', 'returned hook object');
    // t.equal(res.hook.name, 'test-hook-view', 'returned correct name');
    t.end();
  });
});

/*

    HOOK PARAMETER TESTS

*/

// TOOD: create echo hook, destroy and cleanup echo hook
tap.test('get the test view hook', function (t) {
  r({ uri: baseURL + "/david/test-hook-view?foo=bar", method: "get" }, function (err, res) {
    console.log('fff', err, res)
    t.equal(res.substr(0, 9), '<h1>Hello', 'found view with bound output')
    t.error(err, 'did not error');
    t.end();
  });
});

/*
// update hook, add presenter
tap.test('attempt to create a new hook', function (t) {

  var presentHook = function presentHook (opts, cb) {
    var $ = this.$;
    $('.a').html('Hello');
    console.log("INSIDE PRESENTER", $.html())
    cb(null, $.html());
  };
  
  client.hook.update({ 
    "name": "test-hook-view",
    "owner": "david", // Note: should not need owner name, could match name to api key
    "source": 'echo "Goodbye";',
    "language": "bash",
    "view": '<h1 class="a"></h1>',
    "presenter": 'module.exports = ' + presentHook.toString(),
    "themeStatus": "enabled"
  }, function (err, res){
    t.error(err, 'request did not error');
    t.equal(res.status, 'updated', 'returned correct name');
    t.equal(typeof res.hook, 'object', 'returned hook object');
    
    console.log('back from update', err, res)
    //t.equal(res.status, 'created', 'returned correct name');
    //t.equal(typeof res.hook, 'object', 'returned hook object');
    // t.equal(res.hook.name, 'test-hook-view', 'returned correct name');
    t.end();
  });
});

tap.test('get the test view hook', function (t) {
  r({ uri: baseURL + "/david/test-hook-view", method: "get" }, function (err, res) {
    t.equal(res, '<h1 class="a">Hello</h1>', 'found view with bound output')
    t.error(err, 'did not error');
    t.end();
  });
});
*/

/*
tap.test('get the test view hook', function (t) {
  r({ uri: baseURL + "/examples/bash-view", method: "get" }, function (err, res) {
    t.error(err, 'did not error');
    t.equal(res.substr(0, 9), '<h1>Hello', 'found view with bound output')
    t.end();
  });
});
*/

tap.test('perform hard shutdown of cluster', function (t) {
  t.end();
  setTimeout(function(){
    process.exit();
  }, 10);
});