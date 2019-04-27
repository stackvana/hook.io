// hook-fork-test.js
var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');

var sdk = require('hook.io-sdk');

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
  /*
     Requires:
       - examples/bash
  */
  startDevCluster({
    flushRedis: true,
    flushTestUsers: true
  }, function (err) {
    t.pass('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end();
    }, 2000);
  });
});

tap.test('attempt to destroy the forked hook', function (t) {
  client.hook.destroy({ owner: 'david', name: 'echo' }, function (err, res){
    t.error(err, 'request did not error');
    t.end();
  });
});

// TODO: replace with token instead?
tap.test('attempt to fork another user hook - valid session', function (t) {
  r({ 
      uri: baseURL + "/login", 
      method: "POST",
      json: true,
      jar: true,
      form: {
        "email": testUser.email,
        "password": testUser.password
      },
    }, function (err, res) {
      if (err) {
        throw err;
      }
      r({ 
          uri: baseURL + "/examples/echo/fork",
          method: "GET",
          json: true,
          jar: true
        }, function (err, res) {
          t.error(err, 'request did not error');
          t.equal(res.status, 'created');
          t.end();
      });
  })
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end();
  setTimeout(function(){
    process.exit();
  }, 10);
});
