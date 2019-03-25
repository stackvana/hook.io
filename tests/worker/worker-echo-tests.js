var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var examples = require('microcule-examples');
var async = require('async');

// worker-echo-tests.js
var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;

var sdk = require('hook.io-sdk');

var testUser = config.testUsers.bobby;

var client = sdk.createClient(testUser.hookSdk);

var startDevCluster = require('../lib/helpers/startDevCluster');
tap.test('start the dev cluster', function (t) {
  startDevCluster({}, function (err, servers) {
    t.pass('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end();
    }, 3000);
  });
});

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

tap.test('put to the echo hook', function (t) {
  r({ uri: baseURL + "/examples/echo", method: "put" }, function (err, echo) {
    t.error(err, 'did not error');
    t.end();
  });
});

tap.test('delete to the echo hook', function (t) {
  r({ uri: baseURL + "/examples/echo", method: "delete" }, function (err, echo) {
    t.error(err, 'did not error');
    t.end();
  });
});

tap.test('attempt to call all possible echo examples with GET and Query String variables', function (t) {
  var echoExamples = ['javascript-echo', 'coffee-script-echo', 'lua-echo', 'php-echo', 'python-echo', 'ruby-echo'];
  async.eachSeries(echoExamples, function iter (item, next) {
    r({ 
      uri: baseURL + "/examples/" + item + '?foo=bar', 
      method: "GET"
    }, function (err, body) {
      t.equal(body.foo, 'bar', item);
      next();
    });
  }, function complete (err) {
    t.end();
  });
});

tap.test('attempt to call all possible echo examples with POST and JSON data', function (t) {
  var echoExamples = ['javascript-echo', 'coffee-script-echo', 'lua-echo', 'php-echo', 'python-echo', 'ruby-echo'];
  async.eachSeries(echoExamples, function iter (item, next) {
    r({ 
      uri: baseURL + "/examples/" + item, 
      method: "POST",
      json: {
        foo: 'bar'
      }
    }, function (err, body) {
      t.equal(body.foo, 'bar');
      next();
    });
  }, function complete (err) {
    t.end();
  });
});

tap.test('attempt to call all possible echo examples with POST and form encoded data', function (t) {
  var echoExamples = ['javascript-echo', 'coffee-script-echo', 'lua-echo', 'php-echo', 'python-echo', 'ruby-echo'];
  async.eachSeries(echoExamples, function iter (item, next) {
    r({ 
      uri: baseURL + "/examples/" + item, 
      method: "POST",
      form: {
        "foo": "bar"
      }
    }, function (err, body) {
      t.equal(body.foo, 'bar');
      next();
    });
  }, function complete (err) {
    t.end();
  });
});

tap.test('attempt to send http requests with all major languages', function (t) {
  var sendHttpExamples = ['lua-send-http-request', 'javascript-send-http-request', 'python-send-http-request', 'python3-send-http-request', 'ruby-send-http-request'];
  async.eachSeries(sendHttpExamples, function iter (item, next) {
    r({ 
      uri: baseURL + "/examples/" + item, 
      method: "GET"
    }, function (err, body) {
      t.equal(body.foo, 'bar', item);
      next();
    });
  }, function complete (err) {
    t.end();
  });
});


// lua-send-http-request
/*
local http = require 'socket.http'
local crypto = require 'crypto'
local json = require 'json'
local https = require 'ssl.https'

local thetest = string.gsub(Hook_params_test, " ", "")

io.write(thetest)
*/


// php timezone database
/*


date_default_timezone_set("America/Los_Angeles"); 
$time = strftime("%H");
if($time == 18){
echo exec('curl -X POST https://maker.ifttt.com/trigger/Lights/with/key/bfNSv7b9dVqd0mq9KULNyo');
}
*/

tap.test('perform hard shutdown of cluster', function (t) {
  t.end();
  setTimeout(function(){
    process.exit();
  }, 10);
});
