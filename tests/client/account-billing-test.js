// hook-api-test.js
var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var appConfig = require('../../config');
var async = require('async');

var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');
var stripe = require('stripe')(appConfig.stripe.secretKey);

var billing = require('../../lib/resources/billing');
billing.persist(appConfig.couch)

var sdk = require('hook.io-sdk');

var testUser = config.testUsers.bobby;
var testUserDavid = config.testUsers.david;

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
tap.test('attempt to manually create test user in stripe', function (t) {
  // stripe.customers.create({ email: testUser.email }, function (err, customer) {
    // console.log('back from customer create', err, customer)
    stripe.tokens.create({
      card: {
        "number": '4242424242424242',
        "exp_month": 12,
        "exp_year": 2021,
        "cvc": '123'
      }
    }, function(err, token) {
      testUser.stripeToken = token;
      t.error(err);
      t.end();
    });
    /*
    stripe.customers.createSource(customer.id, { source: {
        object: 'card',
        exp_month: 10,
        exp_year: 2018,
        number: '4242 4242 4242 4242',
        cvc: 100
      }}, function (err, result) {
      console.log('back from create source', err, result)
      t.error(err);
      t.end();
    });
    */
  // });
});

tap.test('attempt to subscribe to stripe subscription with brand new account - pro plan', function (t) {
  r({ 
      uri: baseURL + "/billing",
      method: "POST",
      json: true,
      jar: true,
      form: {
        "addCustomer": true,
        "stripeToken": testUser.stripeToken.id,
        "email": testUser.email,
        "amount": 2500
      },
    }, function (err, res) {
      t.error(err, 'request did not error');
      t.equal(typeof res.error, 'undefined', 'did not return error response')
      t.end();
  });
});

var billingEntry;
tap.test('get the customer id from newly created hook.io user', function (t) {
  r({ 
      uri: baseURL + "/billing", 
      method: "GET",
      json: true,
      jar: true,
    }, function (err, res) {
      if (err) {
        throw err;
      }
      billingEntry = res[0];
      t.error(err, 'request did not error');
      t.equal(billingEntry.plan, 'BASIC_HOSTING_PLAN_25', 'hosting plan matches');
      r({ 
          uri: baseURL + "/account", 
          method: "GET",
          json: true,
          jar: true,
        }, function (err, res) {
          t.equal(typeof res.error, 'undefined', 'did not return error response')
          t.error(err, 'request did not error');
          t.equal(res.servicePlan, 'advanced');
          t.end();
      });
  });
});

tap.test('attempt to manually clear test data from stripe', function (t) {
  billing.find({ email: testUser.email }, function(err, results){
    async.each(results, function(b, cb){
      stripe.customers.del(b.stripeID, function (err, customer) {
        b.destroy(function(){
          cb();
        });
      });
    }, function(){
      t.end();
    });
  });
});

tap.test('attempt to subscribe to stripe subscription with existing user - no session', function (t) {
  stripe.tokens.create({
    card: {
      "number": '4242424242424242',
      "exp_month": 12,
      "exp_year": 2021,
      "cvc": '123'
    }
  }, function (err, token) {
    testUserDavid.stripeToken = token;
    r({ 
        uri: baseURL + "/billing", 
        method: "POST",
        json: true,
        jar: false,
        form: {
          "addCustomer": true,
          "stripeToken": testUserDavid.stripeToken.id,
          "email": testUserDavid.email,
          "amount": 2500
        },
      }, function (err, res) {
        t.error(err, 'request did not error');
        t.end();
    });
  });
});

tap.test('attempt to manually clear test data from stripe', function (t) {
  billing.find({ email: testUserDavid.email }, function (err, results) {
    console.log('found the results', results);
    async.each(results, function (b, cb) {
      stripe.customers.del(b.stripeID, function (err, customer) {
        // skip deleting david's $50 plan ( needed for testing )
        if (b.plan === "BASIC_HOSTING_PLAN_50") {
          cb();
        } else {
          b.destroy(function(){
            cb();
          });
        }
      });
    }, function () {
      t.end();
    });
  });
});

tap.test('attempt to subscribe to stripe subscription with existing user - valid session', function (t) {
  stripe.tokens.create({
    card: {
      "number": '4242424242424242',
      "exp_month": 12,
      "exp_year": 2021,
      "cvc": '123'
    }
  }, function(err, token) {
    testUserDavid.stripeToken = token;
    r({
        uri: baseURL + "/login", 
        method: "POST",
        json: true,
        jar: true,
        form: {
          "email": testUserDavid.email,
          "password": "asd"
        },
      }, function (err, res) {

      r({
          uri: baseURL + "/billing", 
          method: "POST",
          json: true,
          jar: true,
          form: {
            "addCustomer": true,
            "stripeToken": testUserDavid.stripeToken.id,
            "email": testUserDavid.email,
            "amount": 2500
          },
        }, function (err, res) {
          t.error(err, 'request did not error');
          t.end();
      });
    });

  });
});

tap.test('attempt to manually clear test data from stripe', function (t) {
  billing.find({ email: testUserDavid.email }, function (err, results) {
    async.each(results, function (b, cb) {
      stripe.customers.del(b.stripeID, function (err, customer) {
        if (b.plan === "BASIC_HOSTING_PLAN_50") {
          cb();
        } else {
          b.destroy(function(){
            cb();
          });
        }
      });
    }, function () {
      t.end();
    });
  });
});

tap.test('attempt to clear test user - as superadmin', function (t) {
  r({ uri: baseURL + "/_admin", method: "POST", json: {
    method: "user.destroy",
    super_private_key: config.superadmin.super_private_key,
    email: testUser.email
  }}, function (err, res, body) {
    t.error(err, 'request did not error');
    t.equal(typeof res, 'object', "response contains object");
    t.equal(res.result, 'deleted', "deleted user");
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('cluster is shutting down');
  setTimeout(function(){
    process.exit();
  }, 10);
});