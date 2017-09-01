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

var testUser = config.testUsers.bobby;

var _config = {};
_config.host = "localhost";
_config.port = 9999;
_config.protocol = 'http';
_config.accessKey = testUser.admin_key;
var client = sdk.createClient(_config);

tap.test('start the dev cluster', function (t) {
  startDevCluster({}, function (err, servers) {
    console.log(servers)
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

/*

    HOOK PARAMETER TESTS

*/

// TOOD: create echo hook, destroy and cleanup echo hook
tap.test('get the echo hook', function (t) {
  r({ uri: baseURL + "/examples/echo", method: "get" }, function (err, res) {
    t.error(err, 'did not error');
    t.end();
  });
});

tap.test('post to the echo hook', function (t) {
  r({ uri: baseURL + "/examples/echo", method: "post" }, function (err, echo) {
    t.error(err, 'did not error');
    t.end();
  });
});

/*

    JSON TESTS

*/

tap.test('post to the echo hook with JSON data', function (t) {
  r({ 
    uri: baseURL + "/examples/echo", 
    method: "POST",
    json: {
      "baz": "boz"
    }
  }, function (err, echo) {
    t.error(err, 'did not error');
    console.log('eee', echo)
    t.equal(echo.baz, "boz", "echo'd back arbitrary json parameter");
    t.end();
  });
});

/*

    FORM SUBMIT TESTS

*/

tap.test('submit a URL-encoded form to the echo hook with form data', function (t) {
  r({ 
    uri: baseURL + "/examples/echo", 
    method: "post",
    form: {
      "baz": "boz"
    }
  }, function (err, echo) {
    t.error(err, 'did not error');
    t.equal(echo.baz, "boz", "echo'd back arbitrary form parameter");
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
/*

    TODO: move to seperate tests, SCHEMA TESTS, needs seperate service

*/

tap.test('get the echo hook and check default schema data', function (t) {
  r({ uri: baseURL + "/examples/echo" }, function (err, echo) {
    t.error(err, 'did not error');
    t.equal(echo.param1, "foo", "echo'd back default schema value for arbitrary parameter");
    t.equal(echo.param2, "bar", "echo'd back default schema value for arbitrary parameter");
    t.end();
  });
});

tap.test('post the echo hook and check default schema data', function (t) {
  r({ uri: baseURL + "/examples/echo", method: "post" }, function (err, echo) {
    t.error(err);
    t.equal(echo.param1, "foo");
    t.equal(echo.param2, "bar");
    t.end();
  });
});

