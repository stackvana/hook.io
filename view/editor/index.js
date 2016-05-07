var config = require('../../config');
var hook = require('../../lib/resources/hook');
var hooks = require('hook.io-hooks');

module['exports'] = function view (opts, callback) {

  var $ = this.$,
      req = opts.request,
      res = opts.response,
      params = req.resource.params,
      user = req.session.user;

  var boot = {};

  boot.baseUrl = config.baseUrl || "";
  var i = req.i18n;

  boot.messages = {
    "passwordBlank": i.__("password cannot be blank..."),
    "passwordMismtach": i.__("passwords do not match..."),
    "passwordConfirm": i.__("confirm account password..."),
    "passwordInvalid": i.__("invalid password. try again..."),
    "passwordReset": i.__("A password reset link has been emailed to:"),
    "createAccount": i.__('Create New Account')
  };

 
  // TODO: gateway.hook.io for production
  $('#gatewayForm').attr('action', config.baseUrl + '/Marak/gateway-javascript');


  var services = hooks.services;
  var examples = {};

  // pull out helloworld examples for every langauge
  hook.languages.forEach(function(l){
    examples[l] = services['examples-' + l + '-hello-world'];
  });

  // list of js examples by order
  var jsExamples = [
    "hello-world",
    "request-parameters",
    "send-http-request",
    "input-schema",
    "pipe-hook",
    "stream-merge",
    "stream-transform",
    "datastore",
    "fake-data"
  ];
  jsExamples = jsExamples.reverse();
  jsExamples.forEach(function (item){
    var ex = services['examples-javascript-' + item];
    $('.selectSnippet').prepend('<option value="' + ex.name + '">' + ex.description + '</option>')
  });

  /*
  for (var s in services) {
    var e = services[s];
    var type = s.split('-')[0], 
        lang = s.split('-')[1];
    if (type === "examples" && lang === "javascript") {
      $('.selectSnippet').prepend('<option value="' + 'marak/' + s + '">' + e.description + '</option>')
    }
  }
  */

  boot.examples = examples;

  //req.i18n.setLocale('de');

  // Localize page based on request lauguage
  $('.deploymentsLink').html(i.__("Deployments"));
  $('.callToAction').html(i.__("Sign up Instantly! It's Free!"));

  //$('.featuresDiv h2').html(i.__("Features"));

  $('.features li a').each(function(index, item){
    var v = $(item).html();
    $(item).html(i.__(v));
  });


  var out = $.html();
  out = out.replace('{{hook}}', JSON.stringify(boot, true, 2));
  return callback(null, out);

};