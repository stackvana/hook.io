var tap = require("tape");
var r = require('../lib/helpers/_request');
//var baseURL = "http://localhost:9999"

var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');

var testUser = config.testUsers.bobby;

var apps;

tap.test('start the dev cluster', function (t) {
  startDevCluster({}, function (err, _apps) {
    apps = _apps;
    t.ok('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end('dev cluster started');
    }, 2000);
  });
});

/*

  attempt to signup by account name

*/

tap.test('attempt to signup with no account name or email', function (t) {
  r({ uri: baseURL + "/signup", method: "POST" }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(typeof res, 'object', "response contains object");
    t.equal(res.result, 'invalid', "is not valid signup");
    t.end();
  });
});

tap.test('attempt to signup by account name with no password', function (t) {
  r({ 
      uri: baseURL + "/signup", 
      method: "POST",
      form: {
        "email": testUser.name
      },
    }, function (err, res) {
      t.error(err, 'request did not error');
      console.log(err, res);
      t.equal(typeof res, 'object', "response contains object");
      t.equal(res.result, 'available', "name is available");
      t.end();
  });
});


/*

Note: Removed from API

tap.test('attempt to signup by account name mismtached passwords', function (t) {
  r({ 
      uri: baseURL + "/signup", 
      method: "POST",
      form: {
        "email": testUser.name,
        "password": "foo",
        "confirmPassword": "fooBar"
      },
    }, function (err, res) {
      t.error(err, 'request did not error');
      t.equal(typeof res, 'object', "response contains object");
      t.equal(res.result, 'invalid', "passwords do not match");
      t.end();
  });
});
*/

tap.test('attempt to signup by account name with valid password', function (t) {
  r({ 
      uri: baseURL + "/signup", 
      method: "POST",
      form: {
        "email": testUser.name,
        "password": "foo",
        "confirmPassword": "foo"
      },
    }, function (err, res) {
      t.error(err);
      t.error(err, 'request did not error');
      t.equal(typeof res, 'object', "response contains object");
      t.equal(res.result, 'valid', "name is available");
      t.end();
  });
});

tap.test('attempt to clear test user - as superadmin', function (t) {
  r({ uri: baseURL + "/_admin", method: "POST", json: {
    method: "user.destroy",
    super_private_key: config.superadmin.super_private_key,
    name: testUser.name
  }}, function (err, res, body) {
    t.error(err);
    t.error(err, 'request did not error');
    t.equal(typeof res, 'object', "response contains object");
    t.equal(res.result, 'deleted', "deleted user");
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('shut down');
  process.exit(0);
});