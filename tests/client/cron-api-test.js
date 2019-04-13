var tap = require('tape');
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');

// david is a pre-generated user 
var testUser = config.testUsers.david;

var sdk = require('hook.io-sdk');

tap.test('start the dev cluster', function (t) {
  startDevCluster({
    flushRedis: true
  }, function (err) {
    if (err) {
      throw err;
    }
    t.pass('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end();
    }, 2000);
  });
});

var client = sdk.createClient(testUser.hookSdk);


tap.test('clear existing test cron', function (t) {
  client.cron.destroy({ 
    name: 'test-cron',
    owner: 'david'
  }, function (err) {
    t.error(err, 'request did not error');
    t.end();
  });
});

tap.test('create new cron', function (t) {
  client.cron.create({
    name: 'test-cron',
    owner: 'david',
    uri: 'http://hook.io/examples/hello-world'
  }, function (err, body) {
    t.error(err, 'request did not error');
    t.equal(body.name, 'test-cron', 'has correct name');
    t.equal(body.owner, 'david', 'has correct owner');
    t.equal(body.uri, 'http://hook.io/examples/hello-world', 'has correct uri');
    t.equal(body.cronExpression, '*/60 * * * *', 'has correct cronExpression');
    t.equal(body.status, 'paused', 'has correct status');
    t.equal(body.method, 'GET', 'has correct method');
    t.end();
  });
});

tap.test('update existing cron', function (t) {
  client.cron.update({
    name: 'test-cron',
    owner: 'david',
    uri: 'http://hook.io/examples/echo',
    status: 'active',
    method: 'POST',
    cronExpression: '* */1 * * *'
  }, function (err, body) {
    t.error(err, 'request did not error');
    var c = body.cron;
    t.equal(body.status, 'updated', 'has correct rpc status');
    t.equal(c.name, 'test-cron', 'has correct name');
    t.equal(c.owner, 'david', 'has correct owner');
    t.equal(c.uri, 'http://hook.io/examples/echo', 'has correct uri');
    t.equal(c.cronExpression, '* */1 * * *', 'has correct cronExpression');
    t.equal(c.status, 'active', 'has correct status');
    t.equal(c.method, 'POST', 'has correct method');
    t.end();
  });
});

tap.test('get an existing cron', function (t) {
  client.cron.get({
    name: 'test-cron',
    owner: 'david',
  }, function (err, c) {
    t.error(err, 'request did not error');
    t.equal(c.name, 'test-cron', 'has correct name');
    t.equal(c.owner, 'david', 'has correct owner');
    t.equal(c.uri, 'http://hook.io/examples/echo', 'has correct uri');
    t.equal(c.cronExpression, '* */1 * * *', 'has correct cronExpression');
    t.equal(c.status, 'active', 'has correct status');
    t.equal(c.method, 'POST', 'has correct method');
    t.end();
  });
});

tap.test('attempt to get existing cron as anonymous', function (t) {
  r({ uri: baseURL + '/cron/david/test-cron', method: 'GET' }, function (err, res) {
    t.error(err, 'request did not error');  
    t.equal(res.error, true);
    t.equal(res.type, 'unauthorized-role-access', 'has correct error type');
    t.equal(res.role, 'cron::read', 'has correct role type');
    t.equal(res.user, 'anonymous', 'has correct role type');
    t.end();
  });
});

tap.test('get all crons for user', function (t) {
  client.cron.all({
    owner: 'david',
  }, function (err, body) {
    t.error(err, 'request did not error');
    t.equal(typeof body.length, 'number', 'has length');
    t.end();
  });
});

tap.test('get all crons for user as anonymous', function (t) {
  r({ uri: baseURL + '/cron/all', method: 'GET' }, function (err, res) {
    t.error(err, 'request did not error');  
    t.equal(res.error, true);
    t.equal(res.type, 'unauthorized-role-access', 'has correct error type');
    t.equal(res.role, 'cron::read', 'has correct role type');
    t.equal(res.user, 'anonymous', 'has correct role type');
    t.end();
  });
});

tap.test('destroy existing cron', function (t) {
  client.cron.destroy({
    name: 'test-cron',
    owner: 'david',
  }, function (err, body) {
    t.error(err, 'request did not error');
    t.equal(body.status, 'deleted', 'has correct rpc status');
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end();
  setTimeout(function(){
    process.exit();
  }, 10);
});