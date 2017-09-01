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

tap.test('get the home page, try to login with test account', function (t) {
  client = client
    .init()
    .url(baseURL)
    .setValue('#email', 'whoami')
    .setValue('#password', 'asd')
    .submitForm('#loginForm')
    .pause(3000)
    .getTitle().then(function(title){
      t.equal(title, "hook.io - Free Microservice and Webhook Hosting. Deploy your code in seconds.")
      t.end();
    });
});

tap.test("attempt to load /new page", function (t) {
  // TODO: check that theme loaded as separate tests
  client
    .url(baseURL + "/new")
    .getTitle().then(function(title){
      // TODO: switch back after production update
      // t.equal(title, "hook.io - Create new Hook");
      t.equal(title, "hook.io - Free Microservice and Webhook Hosting. Deploy your code in seconds.");
      console.log(title)
      t.end();
    });
});

tap.test("attempt to create new hook with only setting parameter", function (t) {
  // TODO: check that theme loaded as separate tests
  client
    .setValue('#name', 'test-hook')
    .submitForm('#hookForm')
    .pause(3000)
    .getHTML('body').then(function (body){
      t.equal(body, "<body><pre>{\n  \"owner\": \"whoami\",\n  \"hook\": \"test-hook\"\n}\n</pre></body>")
      t.end();
    });
});

tap.test("attempt to delete newly created hook ", function (t) {
  // TODO: check that theme loaded as separate tests
  // TODO: change back when production updates with new /delete link
  // var deleteLink = 'http://localhost:9999/whoami/test-hook/delete';
  var deleteLink = baseURL + '/whoami/test-hook?delete=true';
  client
  .url(deleteLink)
  .pause(5000)
  .getTitle().then(function(title){
    t.equal(title, "hook.io - Free Microservice and Webhook Hosting. Deploy your code in seconds.")
    t.end();
  });
});


tap.test('shut down webdriver', function (t){
  client.pause(5000)
  client.end();
  t.end();
});

