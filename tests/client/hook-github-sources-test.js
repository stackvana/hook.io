// hook-github-sources-test
var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');
var examples = require('microcule-examples');
var async = require('async');
var pl = require('../../lib/resources/programmingLanguage');

var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;

var sdk = require('hook.io-sdk');
var testUser = config.testUsers.david;
var client = sdk.createClient(testUser.hookSdk);

tap.test('start the dev cluster', function (t) {
  startDevCluster({}, function (err, servers) {
    t.ok('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end('dev cluster started');
    }, 3000);
  });
});

tap.test('attempt to destroy the github source test hooks', function (t) {
  client.hook.destroy({ owner: 'david', name: 'test-github-repo-hook' }, function (err, res){
    t.error(err, 'request did not error');
    client.hook.destroy({ owner: 'david', name: 'test-github-gist-hook' }, function (err, res){
      t.error(err, 'request did not error');
      t.end();
    });
  });
});

tap.test('attempt to create a new hook with github repo source', function (t) {
  client.hook.create({
    "name": "test-github-repo-hook",
    "hookSource": "githubRepo",
    "githubRepo": "stackvana/microcule-examples",
    "githubBranch": "master",
    "mainEntry": "echo/index.js",
    "language": "javascript"
  }, function (err, body, res){
    t.error(err, 'request did not error');
    t.equal(body.status, 'created', 'returned correct name');
    t.end();
  });
});

tap.test('attempt to create a new hook with github gist source', function (t) {
  client.hook.create({
    "name": "test-github-gist-hook",
    "mainEntry": "echoHttpRequest.js",
    "gist": "https://gist.github.com/Marak/357645b8a17daeb17458",
    "hookSource": "gist",
    "language": "javascript"
  }, function (err, body, res){
    t.error(err, 'request did not error');
    t.equal(body.status, 'created', 'returned correct name');
    t.end();
  });
});

tap.test('get the resource for the github repo hook', function (t) {
  r({ uri: baseURL + "/david/test-github-repo-hook/resource", method: "get", json: true }, function (err, res) {
    t.error(err, 'did not error');
    t.equal(res.hookSource, 'githubRepo', 'echo back correct properties');  
    t.end();
  });
});

tap.test('get the resource for the github gist hook', function (t) {
  r({ uri: baseURL + "/david/test-github-gist-hook/resource", method: "get", json: true }, function (err, res) {
    t.error(err, 'did not error');
    t.equal(res.hookSource, 'gist', 'echo back correct properties');  
    t.end();
  });
});

tap.test('GET the github repo echo hook', function (t) {
  r({ uri: baseURL + "/david/test-github-repo-hook?foo=bar", method: "get", json: true }, function (err, res) {
    t.error(err, 'did not error');
    t.equal(res.foo, 'bar', 'echo\'d back correct variable');
    t.end();
  });
});

tap.test('POST to the github repo echo hook', function (t) {
  r({ uri: baseURL + "/david/test-github-repo-hook", method: "post", form: { foo: 'bar' }, json: true }, function (err, res) {
    t.error(err, 'did not error');
    t.equal(res.foo, 'bar', 'echo\'d back correct variable');
    t.end();
  });
});

tap.test('POST to the github gist echo hook', function (t) {
  r({ uri: baseURL + "/david/test-github-gist-hook", method: "post", form: { foo: 'bar' }, json: true }, function (err, res) {
    t.error(err, 'did not error');
    t.equal(res.foo, 'bar', 'echo\'d back correct variable');
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('cluster is shutting down');
  setTimeout(function(){
    process.exit();
  }, 10);
});