// disabled until we have a paid for saucelabs account
return;

var tap = require("tape");
var config = require('../config');
var webdriverio = require('webdriverio');

var options = {
  host: config.host,
  port: config.port,
  user: config.user,
  key: config.key,
  desiredCapabilities: {
    browserName: 'firefox'
  },
  logLevel: 'verbose',
  singleton: true
};

var client = webdriverio.remote(options);

var baseURL = config.baseUrl;

var parseJSON = require('../lib/helpers/parseJSON');

var driver;

tap.test('get the home page, check the title', function (t) {
  client = client
    .init()
    .url(baseURL)
    .getTitle().then(function(title){
      t.equal(title, "hook.io - Free Microservice and Webhook Hosting. Deploy your code in seconds.")
      console.log(title)
    })
    t.end();
});

tap.test("get the echo hook, check the response", function (t) {
  client
    .url(baseURL + "/marak/echo")
    .getText('pre').then(function(source){
      var echo = parseJSON(source);
      // TODO: schema default values as separate test
      //t.equal(echo.param1, "foo");
      //t.equal(echo.param2, "bar");
      t.equal(echo.owner, "marak");
      t.end();
    })
});

tap.test("get the echo hook with query string, check the response", function (t) {
  client
    .url(baseURL + "/marak/echo?test=hello&baz=boz")
    .getText('pre').then(function(source){
      var echo = parseJSON(source);
      t.equal(echo.owner, "marak");
      t.equal(echo.test, "hello");
      t.equal(echo.baz, "boz");
      t.end();
    })
});

tap.test("get the echo hook with form theme, check the response", function (t) {
  // TODO: check that theme loaded as separate tests
  client
    .url(baseURL + "/marak/echo?theme=form")
    .setValue("input[name='param1']", 'hello')
    .submitForm('.form')
    .getText('.hookOutput').then(function(source){
      var echo = parseJSON(source[1]); // TODO: fix bad .hookOutput css
      t.equal(echo.owner, "marak");
      t.equal(echo.param1, "hello");
      t.end();
    })
});

tap.test('shut down webdriver', function (t){
  client.end();
  t.end();
});