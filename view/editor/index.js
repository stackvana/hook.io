var config = require('../../config');
var hook = require('../../lib/resources/hook');
var hooks = require('hook.io-hooks');
var psr = require('parse-service-request');

module['exports'] = function view (opts, callback) {

  var $ = this.$,
      req = opts.request,
      res = opts.response,
      params = req.resource.params,
      user = req.session.user;

  var boot = {};

  boot.baseUrl = config.app.url || "";
  var i = req.i18n;

  boot.messages = {};
  req.session.redirectTo = "/new";
  // TODO: gateway.hook.io for production
  $('#gatewayForm').attr('action', config.app.url + '/gateway');

  var services = hooks.services;
  var examples = {};

  // pull out helloworld examples for every langauge
  hook.languages.forEach(function(l){
    examples[l] = services[l + '-hello-world'];
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
    "files-writefile",
    "files-readfile",
    "fake-data"
  ];
  jsExamples = jsExamples.reverse();
  jsExamples.forEach(function (item){
    var ex = services['javascript-' + item];
    if (ex) {
      $('.selectSnippet').prepend('<option value="' + ex.name + '">' + ex.description + '</option>')
    }
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


  psr(req, res, function(){
    var params = req.resource.params;

    if (params.source) {
      // TODO: better saving of temporary source
      // Could implement a "clipboard" scratch type pattern for services / service code in the request session
      // Similiar to revision history, but separate and temporary
      // Could show a UI for it whenever an editor is around
      req.session.tempSource = params.source;
      req.session.tempLang = params.lang;
      return res.redirect('/new');
      // redirect to /new with new source, do not create
    }

    $ = req.white($);

    var out = $.html();
    out = out.replace('{{hook}}', JSON.stringify(boot, true, 2));
    return callback(null, out);

  });

};