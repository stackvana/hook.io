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

tap.test('attempt to signup by just account name', function (t) {
  r({ 
      uri: baseURL + "/signup", 
      method: "POST",
      form: {
        "name": testUser.name
      },
    }, function (err, res) {
      t.error(err, 'request did not error');
      t.equal(typeof res, 'object', "response contains object");
      t.equal(res.result, 'invalid', "unable to signup with just account name");
      t.end();
  });
});

var request = require('request');
var cookieRequest = request.defaults({jar: true})

tap.test('attempt to signup by email with no password', function (t) {
  
  var opts = { 
    uri: baseURL + '/signup',
    form: {
    "email": testUser.email
    },
    method: 'POST',
    json: true,
    jar: true
  };

  r(opts, function (err, body) {
    // now have cookies
    // cookieRequest('http://images.google.com')
    t.equal(body.result, 'valid', "registered valid account by email");
    var opts = { 
      uri: baseURL + '/session',
      method: 'GET',
      json: true,
      jar: true
    };
    r(opts, function (err, body) {
      t.equal(body.email, testUser.email, 'has correct req.session.email')
      t.end();
    });
  })

});


tap.test('attempt to get session - with cookies', function (t) {

  var opts = { 
    uri: baseURL + '/session',
    method: 'GET',
    json: true,
    jar: true
  };
  r(opts, function (err, body) {
    t.equal(body.email, testUser.email)
    t.end();
  });

});

tap.test('attempt to register account name - with cookies - missing password', function (t) {

  var opts = { 
    uri: baseURL + '/register',
    form: {
      account_name: 'bobby'
    },
    method: 'POST',
    json: true,
    jar: true
  };
  r(opts, function (err, body, res) {
    t.error(err, 'did not return error');
    t.equal(res.statusCode, 400);
    t.equal(body.message, 'Password field is required.');
    t.end();
  });

});

tap.test('attempt to register account name - with cookies - has password', function (t) {
  var opts = { 
    uri: baseURL + '/register',
    form: {
      account_name: 'bobby',
      password: 'asd',
      confirmPassword: 'asd'
    },
    method: 'POST',
    json: true,
    jar: true
  };
  r(opts, function (err, body, res) {
    t.equal(res.statusCode, 200);
    t.equal(body.result, 'success');
    t.end();
  });
});

tap.test('attempt to register same account name - with cookies - has confirmed password', function (t) {
  var opts = { 
    uri: baseURL + '/register',
    form: {
      account_name: 'bobby',
      password: 'asd',
      confirmPassword: 'asd'
    },
    method: 'POST',
    json: true,
    jar: true
  };
  r(opts, function (err, body, res) {
    t.error(err, 'did not return error');
    t.equal(body.result, 'already-registered', 'returns already-registered message');
    t.end();
  });
});

/*

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

/*

tap.test('attempt to signup by email name with valid password', function (t) {
  r({ 
      uri: baseURL + "/signup", 
      method: "POST",
      form: {
        "email": testUser.email,
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
*/

tap.test('attempt to logout out of session', function (t) {
  r({ 
      uri: baseURL + "/logout", 
      method: "GET",
      jar: true
    }, function (err, body, res) {
      t.error(err, 'request did not error');
      t.equal(typeof res, 'object', "response contains object");
      console.log('bbbb', body)
      t.equal(res.statusCode, 200, "logged out and redirected");
      var opts = { 
        uri: baseURL + '/session',
        method: 'GET',
        json: true,
        jar: true
      };
      r(opts, function (err, body) {
        // console.log("BBBB", body)
        t.equal(typeof body.email, "undefined", "did not find req.session.email")
        t.equal(typeof body.user, "undefined", "did not find req.session.user")
        t.end();
      });
  });
});

tap.test('attempt to signup with same email address', function (t) {
  r({ 
      uri: baseURL + "/signup", 
      method: "POST",
      form: {
        "email": testUser.email
      },
    }, function (err, res) {
      t.error(err, 'request did not error');
      t.equal(typeof res, 'object', "response contains object");
      t.equal(res.result, 'exists', "email is already registered");
      t.end();
  });
});

tap.test('attempt to login with with new account', function (t) {
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
      t.error(err, 'request did not error');
      t.equal(typeof res, 'object', "response contains object");
      t.equal(res.result, 'valid', "valid login");
      t.end();
  });
});

tap.test('attempt to get account page - valid session', function (t) {

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
          method: "GET",
          json: true,
          jar: true
        }, function (err, res) {
          t.error(err, 'request did not error');
          t.equal(res.name, 'bobby', 'has correct name');
          t.equal(res.email, 'bobby@marak.com', 'has correct email');
          t.equal(res.status,'new', 'has correct status');
          t.equal(res.paidStatus,'unpaid', 'has correct paidStatus');
          t.equal(res.servicePlan, 'free', 'has correct servicePlan');
          t.equal(typeof res.hookAccessKey, 'string', 'has hook access key as string');
          if (typeof res.hookAccessKey === 'string') {
            t.equal(res.hookAccessKey.length, 36, 'is uuid');
          }
          t.end();
      });
  })

});

tap.test('attempt to clear test user - as superadmin', function (t) {
  r({ uri: baseURL + "/_admin", method: "POST", json: {
    method: "user.destroy",
    super_private_key: config.superadmin.super_private_key,
    email: testUser.email
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
  setTimeout(function(){
    process.exit();
  }, 10);
});