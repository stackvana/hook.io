// hook-api-test.js
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
// Basic account API tests
//

// TODO: replace with token instead?
tap.test('attempt to update account password - valid session', function (t) {

  r({ 
      uri: baseURL + "/login", 
      method: "POST",
      json: true,
      jar: true,
      form: {
        "email": testUser.email,
        "password": "asd"
      },
    }, function (err, res) {

      r({ 
          uri: baseURL + "/account", 
          method: "POST",
          json: true,
          jar: true,
          form: {
            "email": testUser.email,
            "password": "asd"
          },
        }, function (err, res) {

          t.error(err, 'request did not error');
          console.log(res)
          t.end();
      });

  })

});

tap.test('attempt to update account password - valid session', function (t) {
  
  r({ 
      uri: baseURL + "/login", 
      method: "POST",
      json: true,
      jar: true,
      form: {
        "email": testUser.email,
        "password": "asd"
      },
    }, function (err, res) {

      r({ 
          uri: baseURL + "/account", 
          method: "POST",
          html: true,
          jar: true,
          form: {
            "email": testUser.email,
            "password": "asd"
          },
        }, function (err, res) {

          t.error(err, 'request did not error');
          console.log(res)
          t.end();
      });

  })
  
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('cluster is shutting down');
  setTimeout(function(){
    process.exit();
  }, 10);
});
