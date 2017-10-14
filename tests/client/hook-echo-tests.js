var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');
var examples = require('microcule-examples');
var async = require('async');
var pl = require('../../lib/resources/programmingLanguage');

// hook-api-test.js
var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;

var sdk = require('hook.io-sdk');

var testUser = config.testUsers.bobby;

var client = sdk.createClient(testUser.hookSdk);

tap.test('start the dev cluster', function (t) {
  startDevCluster({}, function (err, servers) {
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
    t.equal(echo.baz, "boz", "echo'd back arbitrary json parameter");
    t.end();
  });
});

/*

    FORM SUBMIT TESTS

*/

tap.test('submit a URL-encoded form to the javascript echo hook with form data', function (t) {
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

tap.test('submit a URL-encoded form to the lua echo hook with form data', function (t) {
  r({ 
    uri: baseURL + "/examples/lua-echo", 
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

// TODO: search examples for all *-echo tests and call them in loop
tap.test('attempt to call all possible *-hello-world examples', function (t) {

  var customResponses = {
    'r': '[1] "hello world"\n'
  };

  var helloExamples = [];
  pl.alpha.push('babel')
  Object.keys(examples.services).forEach(function(s){
    if (s.search(/hello/) !== -1 && pl.alpha.indexOf(examples.services[s].language) === -1) {
      helloExamples.push(s);
    }
  });

  async.eachSeries(helloExamples, function iter (item, next) {
    var lang = examples.services[item].language;
    r({ 
      uri: baseURL + "/examples/" + item, 
      method: "GET"
    }, function (err, body) {
      var customResponses = {
        "r": '[1] "hello world"\n',
        "python-wsgi-hello-world": "hello world\n"
      };

      var noCarriageReturn = ["perl", "scheme", "php"];
      if (typeof customResponses[lang] !== 'undefined') {
        t.equal(body, customResponses[lang], 'got correct response from ' + lang);
        next();
        return;
      }

      if (typeof customResponses[item] !== 'undefined') {
        t.equal(body, customResponses[item], 'got correct response from ' + item);
        next();
        return;
      }

      var doCRLF = [];
      var crlf = (process.platform == 'win32')?'\r\n':'\n';
      if (noCarriageReturn.indexOf(lang) !== -1) {
        t.equal(body, 'hello world', 'got correct response from ' + lang);
      } else if (doCRLF.indexOf(lang) !== -1) {
        t.equal(body, 'hello world'+crlf, 'got correct response from ' + lang);
      } else {
        if (noCarriageReturn.indexOf(lang) !== -1) {
          t.equal(body, 'hello world', 'got correct response from ' + lang);
        } else {
          t.equal(body, 'hello world\n', 'got correct response from ' + lang);
        }
      }
      next();
    });
  }, function complete (err) {
    t.end();
  });

});

/*

tap.test('attempt to call all possible *-echo examples', function (t) {
//  console.log(Object.keys(examples.services))
  
  var echoExamples = [];

  Object.keys(examples.services).forEach(function(s){
    if (s.search(/echo/) !== -1) {
      echoExamples.push(s);
    }
  });

  async.eachSeries(echoExamples, function iter (item, next) {
    r({ 
      uri: baseURL + "/examples/" + item, 
      method: "POST",
      json: {
        "baz": "boz"
      }
    }, function (err, echo) {
      t.error(err, 'did not error');
      // certain languages don't return JSON by default
      switch (item) {
        case 'bash-echo':
          t.equal(echo, "baz=boz\n", "echo'd back correct value");
        break;
        case 'clisp-echo':
          t.equal(echo, '\n#S(HASH-TABLE :TEST FASTHASH-EQL (BAZ . "boz")) \n', "echo'd back correct value");
        break;
        default:
          t.equal(echo.baz, "boz", "echo'd back arbitrary json parameter");
        break;
      }
      next();
    });
  }, function end (){
    t.end();
  });

});
*/
/*

    TODO: move to seperate tests, SCHEMA TESTS, needs seperate service

*/

tap.test('get the echo hook and check default schema data', function (t) {
  r({ uri: baseURL + "/examples/javascript-input-schema" }, function (err, echo) {
    t.error(err, 'did not error');
    t.equal(echo.name, "Bob", "echo'd back default schema value for arbitrary parameter");
    t.end();
  });
});

tap.test('post the echo hook and check default schema data', function (t) {
  r({ uri: baseURL + "/examples/javascript-input-schema", method: "post" }, function (err, echo) {
    t.error(err);
    t.equal(echo.name, "Bob", "echo'd back default schema value for arbitrary parameter");
    t.end();
  });
});

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('cluster is shutting down');
  setTimeout(function(){
    process.exit();
  }, 10);
});