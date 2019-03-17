// hook-api-test.js
var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');

var sdk = require('hook.io-sdk');

var testUser = config.testUsers.david;

var client = sdk.createClient(testUser.hookSdk);

tap.test('start the dev cluster', function (t) {
  startDevCluster({}, function (err) {
    t.pass('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end();
    }, 1500);
  });
});

//
// Basic hook.io environment variable tests
//

// create a hook
tap.test('attempt to create a new hook', function (t) {
  client.hook.create({ 
    "name": "test-hook",
    "source": 'echo "hello";',
    "language": "bash"
  }, function (err, res){
    t.error(err, 'request did not error');
    t.end();
  });
});


tap.test('attempt to write new variables to env - correct access key', function (t) {
  // Note: To delete an existing value, simply set it to null
  client.env.set({ 
    "a": 1,
    "b": null,
    "c": { "foo": "bar" },
    "isGood": true,
    "e": ['a', 2, new Date()],
    "foo": "bar"
   }, function (err, res) {
     t.error(err, 'request did not error');
     t.equal(typeof res, 'object', "has correct object type");
     t.equal(res.status, 'updated', "updated values")
     console.log(err, res)
     t.end();
  });
});

tap.test('attempt to get those variables from env - correct access key', function (t) {
  client.env.get(function (err, res) {
    t.error(err, 'request did not error');
    t.equal(typeof res, 'object', "has correct object type");
    t.equal(res.foo, "bar", "has correct string value");
    t.equal(res.a, 1, "has correct number value");
    t.equal(res.isGood, true, "has correct boolean value");
    t.end();
  });
});

tap.test('attempt to update one of those variables from env - correct access key', function (t) {
  client.env.set({
    foo: "boo",
    a: null // setting env property to `null` will delete the property
  }, function (err, res) {
    t.error(err, 'request did not error');
    t.equal(typeof res, 'object', "has correct object type");
    t.end();
  });
});

tap.test('check that the env update was correct - correct access key', function (t) {

  client.env.get(function (err, res) {
    t.error(err, 'request did not error');
    t.equal(typeof res, 'object', "has correct object type");
    t.equal(res.foo, "boo", "has correct string value");
    t.equal(typeof res.a, 'undefined', "deleted undefined value");
    t.equal(res.isGood, true, "still has correct boolean value");
    t.end();
  });

});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end();
  setTimeout(function(){
    process.exit(0);
  }, 1500)
});