// view-test.js
var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');
var async = require('async');
var sdk = require('hook.io-sdk');

var testUser = config.testUsers.david;

var client = sdk.createClient(testUser.hookSdk);

var webServer;
var allPageKeys;

function enumerateView (v) {
  var arr = [];
  if (typeof v.views !== 'object') {
    return arr;
  }
  var keys = Object.keys(v.views);
  keys.forEach(function(k){
    if (k === 'index') {
      return;
    }
    if (typeof v[k].views === 'object') {
      arr.push(v[k].key);
      Object.keys(v[k].views).forEach(function(sk){
        if (sk === 'index') {
          return;
        }
        if (typeof v[k].views[sk].views === 'object') {
          var subs = enumerateView(v[k].views[sk]);
          subs.forEach(function(s){
            arr.push(s)
          });
        } else{
          if (v[k].views[sk].key !== '/') {
            arr.push(v[k].views[sk].key)
          }
        }
      });
    } else {
      if (v[k].key !== '/') {
        arr.push(v[k].key);
      }
    }
  });
  return arr;
};

//
// Helper assert for checking if a page response has unmatched {{fooBar}} style replacements
// This is !!SUPER!! useful for catching missing data-binds in the view causing mustaches to render to client
//
function checkMissingMustacheReplacement (t, text, item) {
  if (typeof text === "string") {
    // check that the returned HTML response does not contain any unmatched mustache replacements
    // such as: {{appUrl}} or {{appName}}
    var search = text.search("{{") || text.search("}}");
    // exclude certain pages which actually presenter {{fooBar}} style strings to user ( such as documentation or source code )
    if (['/themes', '/examples/bash-view/view', '/emails/layout', '/emails/0_referral_madness', '/emails/1_paid_accounts'].indexOf(item) === -1) {
      t.equal(search, -1, 'did not found any unmatched mustache replacements in ' + item)
    }
  }
}

tap.test('start the dev cluster', function (t) {
  startDevCluster({
    flushRedis: true
  }, function (err, servers) {
    t.error(err)
    webServer = servers['web'];
    // get flat representation of all files
    allPageKeys = enumerateView(webServer.view)
    t.pass('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end();
    }, 1500);
  });
});

// attempt to get all pages as JSON
// TODO: smoke test with valid auth
// TODO: check text/html response in additional to json response, make sure formats / headers are set
tap.test('attempt to get all pages - no session', function (t) {
  var callbacks = 0;
  var all = {};
  // t.plan(allPageKeys.length * 2);
  allPageKeys = allPageKeys.filter(function(a){
    if (['/helpers/i18n', '/helpers/html', '/hook/_rev', '/hook/_src', '/billingForm'].indexOf(a) === -1) {
      all[a] = a;
      return a;
    }
  });
  async.eachLimit(allPageKeys, 20, function iter (item, next) {
    r({ uri: baseURL + item, method: "GET", json: true }, function (err, body, res) {
      all[item] = null;
      t.error(err);
      // var shouldReturn404 = ['/hook/_rev', '/hook/_src']; // TODO: remove helpers/i18n from view folder
      t.equal(res.statusCode >= 200 && res.statusCode < 500, true, item + ' got 200-400 range response');
      checkMissingMustacheReplacement(t, body, item);
      // t.pass('cluster started');
      next();
    });
  }, function end () {
    t.end();
  });
});

// TODO: check text/html response in additional to json response, make sure formats / headers are set
tap.test('attempt to get all pages - logged in test user - json responses', function (t) {

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
      t.error(err, 'request did not error');
      t.equal(typeof res, 'object', "response contains object");
      t.equal(res.result, 'valid', "valid login");

      allPageKeys.push('/admin?owner=david&name=test-hook');
      allPageKeys.push('/david/test-hook/_rev');
      allPageKeys.push('/david/test-hook/_src');
      allPageKeys.push('/david/test-hook/source');
      allPageKeys.push('/david/test-hook/package');
      allPageKeys.push('/david/test-hook/presenter');

      allPageKeys.push('/examples/bash-view/view');

      allPageKeys.push('/marak/gist-test/source');

      var callbacks = 0;
      // t.plan(allPageKeys.length * 2);
      allPageKeys = allPageKeys.filter(function(a){
        if (['/helpers/i18n', '/hook/_rev', '/hook/_src'].indexOf(a) === -1) {
          return a;
        }
      });
      async.eachLimit(allPageKeys, 50, function iter (item, next) {
        r({ uri: baseURL + item, method: "GET", json: true, jar: true }, function (err, body, res) {
          t.error(err);
          // var shouldReturn404 = ['/hook/_rev', '/hook/_src']; // TODO: remove helpers/i18n from view folder
          t.equal(res.statusCode >= 200 && res.statusCode < 500, true, 'got 200-400 range response')
          // check that the returned HTML response does not contain any unmatched mustache replacements
          // such as: {{appUrl}} or {{appName}}
          checkMissingMustacheReplacement(t, body, item);
          t.pass('cluster started');
          next();
        });
      }, function end (){
        t.end();
      })

  });

});

tap.test('attempt to get all pages - logged in test user - non json responses', function (t) {
  r({
      uri: baseURL + "/login",
      method: "POST",
      jar: true,
      json: true,
      form: {
        "email": testUser.email,
        "password": testUser.password
      },
    }, function (err, res) {
      t.error(err, 'request did not error');
      t.equal(typeof res, 'object', "response contains object");
      t.equal(res.result, 'valid', "valid login");

      var callbacks = 0;
      var all = {};
      // TODO: why so many commented out???
      allPageKeys = allPageKeys.filter(function(a){
        if (['/helpers/i18n', '/helpers/html', '/hook/_rev', '/hook/_src', '/billingForm', '/account', '/domains', '/keys', '/register'].indexOf(a) === -1) {
          all[a] = a;
          return a;
        }
      });
      async.eachLimit(allPageKeys, 1, function iter (item, next) {
        r({ uri: baseURL + item, method: "GET", html: true, jar: true }, function (err, body, res) {
          all[item] = null
          t.error(err);
          // var shouldReturn404 = ['/hook/_rev', '/hook/_src']; // TODO: remove helpers/i18n from view folder
          t.equal(res.statusCode >= 200 && res.statusCode < 500, true, 'got 200-400 range response')
          checkMissingMustacheReplacement(t, body, item);
          next();
        });
      }, function end (){
        t.end();
      })

  });

});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end();
  setTimeout(function(){
    process.exit();
  }, 10);
});
return;

