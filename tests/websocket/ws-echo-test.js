var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var wsUrl = config.wsUrl;

var startDevCluster = require('../lib/helpers/startDevCluster');

tap.test('start the dev cluster', function (t) {
  startDevCluster({
    flushRedis: true
  }, function (err, _apps) {
    apps = _apps;
    t.pass('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end();
    }, 2000);
  });
});

/*

    HOOK WEBSOCKET TESTS

*/

var WebSocket = require('ws');
var echoWs, missingWs, rootWs;

tap.test('create a ws connection to echo', function (t) {
  echoWs = new WebSocket('ws://' + wsUrl + '/examples/echo');
  echoWs.on('open', function open () {
    t.pass('cluster started');
    t.end()
  });
});

tap.test('send some data to the echo hook over websocket', function (t) {
  var count = 0;
  echoWs.send('hello');
  echoWs.once('message', function(data, flags) {
    console.log('wwwww', data, flags);
    data = JSON.parse(data);
    t.equal(typeof data, 'object', 'return json string');
    t.equal(data.body, "hello", "echo'd back body property")
    t.end();
  });  
});

tap.test('send some data to the echo hook over websocket', function (t) {
  var count = 0;
  echoWs.send('{"foo": "bar"}');
  echoWs.once('message', function(data, flags) {
    data = JSON.parse(data);
    t.equal(typeof data, 'object', 'return json string');
    t.equal(data.foo, "bar", "echo'd back foo property")
    t.end();
  });  
});

tap.test('create a ws connection to missing hook', function (t) {
  missingWs = new WebSocket('ws://' + wsUrl + '/doesnt/exist');
  missingWs.on('open', function open () {
    t.pass('cluster started');
    t.end()
  });
});

// TODO: not getting 404 JSON message anymore?
/*
tap.test('send some data to missing hook over websocket', function (t) {
  var count = 0;
  missingWs.send('hello');
  missingWs.once('message', function(data, flags) {
    
    //console.log('ffff', data)
    data = JSON.parse(data);
    t.equal(typeof data, 'object', 'return json string');
    t.equal(data.status, 404, "returned 404 status")
    t.end();
  });  
});
*/

// TODO: add test for error conditions on websocket?

tap.test('create a ws connection to ws root', function (t) {
  rootWs = new WebSocket('ws://' + wsUrl + '');
  rootWs.on('open', function open () {
    t.pass('cluster started');
    t.end()
  });
});

tap.test('send some data to ws root', function (t) {
  var count = 0;
  rootWs.send('hello');
  rootWs.once('message', function(data, flags) {
    data = JSON.parse(data);
    t.equal(typeof data, 'object', 'return json string');
    t.equal(data.status, "online", "worker online")
    t.end();
  });  
});

tap.test('close all connections', function (t) {
  echoWs.close();
  missingWs.close();
  rootWs.close();
  t.end();
});

tap.test('perform hard shutdown of cluster', function (t) {
  setTimeout(function(){
    process.exit();
  }, 10);
  t.end();
});

