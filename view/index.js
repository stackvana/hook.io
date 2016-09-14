var config = require('../config');
var hook = require('../lib/resources/hook');
var hooks = require('hook.io-hooks');
var slug = require('slug');
slug.defaults.modes['rfc3986'] = {
    replacement: '-',      // replace spaces with replacement
    symbols: true,         // replace unicode symbols or not
    remove: null,          // (optional) regex to remove characters
    charmap: slug.charmap, // replace special characters
    multicharmap: slug.multicharmap // replace multi-characters
};
slug.charmap['@'] = "-";
slug.charmap['.'] = "-";

// TODO: this should be part of mschema. see: https://github.com/mschema/mschema/issues/10
var address = {
  "type": "string",
  "regex": /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
};

module['exports'] = function view (opts, callback) {

  var userResource = require('../lib/resources/user');

  var $ = this.$,
      req = opts.request,
      res = opts.response,
      params = req.resource.params,
      user = req.session.user;

  var boot = {};

  boot.baseUrl = config.app.url;
  var i = req.i18n;

  boot.messages = {
    "passwordBlank": i.__("password cannot be blank..."),
    "passwordMismtach": i.__("passwords do not match..."),
    "passwordConfirm": i.__("confirm account password..."),
    "passwordInvalid": i.__("invalid password. try again..."),
    "passwordReset": i.__("A password reset link has been emailed to:"),
    "createAccount": i.__('Create New Account')
  };

  //
  // enables curl signups
  // EASYTODO: move this into separate module
  //
  // curl https://hook.io?signup=youremail@marak.com
  if (typeof params.signup !== "undefined" && params.signup.length > 0) { // TODO: email validation
    // TODO: this should be part of mschema. see: https://github.com/mschema/mschema/issues/10
    if(!address.regex.test(params.signup)) { // test email regex
      return res.end(params.signup + ' is an invalid email address...');
    }
    var query = { email: params.signup };
    return userResource.find(query, function(err, results){
      if (err) {
        return res.end(err.stack);
      }
      if (results.length > 0) {
        return res.end(params.signup + ' is already signed up!');
      }
      return userResource.create({ email: params.signup, name: slug(params.signup) }, function(err, result){
        if (err) {
          return res.end(err.stack);
        }
        return res.send(params.signup + ' is now signed up!');
      });
    });
  }
  //
  // end curl signups
  //

  // Render a cURL friendly response
  if (req.headers.accept === "*/*") {
    var address = "";
    if (typeof req.connection !== "undefined" && typeof req.connection.remoteAddress !== "undefined") {
      address = req.connection.remoteAddress.toString();
    }
    // TODO: move curl welcome screen to new module
    var message = "Greetings " + address + '\n';
    message += "Thank you for cURLing hook.io! \n\n"
    message += "We understand that not everyone is super thrilled to use a 'web-browser',\n";
    message += "so we also provide terminal services for accessing our hosting platform.\n\n";

    message += "Here are some tricks to start! \n\n";
    message += "cURL us back later for a more comprehensive terminal interface with ssh support. \n\n";

    message += "Sign up for a free hook.io account!\n\n".underline;
    message += "  curl https://hook.io?signup=youremail@marak.com  \n\n";

    message += "Send Query String Data\n\n".underline;
    message += "  curl --data 'foo=bar&hello=there' http://echo.hook.io/ \n\n";
    
    message += "Post JSON Data\n\n".underline;
    message += "  curl -H \"Content-Type: application/json\" -X POST -d '{\"foo\":\"bar\",\"hello\":\"there\"}' http://echo.hook.io \n\n";

    message += "Pipe and Transform Data\n\n".underline;
    message += "  echo 'foo' | curl --header 'content-type: application/octet-stream' --data-binary @- http://transform.hook.io/ \n\n";

    message += "Pipe JavaScript Functions to the Cloud\n\n".underline;
    message += "  Note: This example requires a echo.js microservice file\n";
    message += "  See:  http://echo.hook.io/source for example source code\n\n";
   
    message += "  cat echo.js | curl --data-urlencode source@- http://gateway.hook.io\n\n";

    message += "Pipe Binary Data As Multipart Form Upload\n\n".underline;
    message += "  Note: This example requires a cat.png image file.\n\n";
    message += "  cat cat.png | curl -F 'degrees=180' -F 'image=@-;type=image/png' http://image.rotate.hook.io/ > upsidedown-cat.png \n\n";

    return res.end(message);
  }
  // TODO: gateway.hook.io for production
  $('#gatewayForm').attr('action', config.app.url + '/Marak/gateway-javascript');


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
    var ex = services['javascript-' + item];
    if (typeof ex !== "undefined") {
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

  var i18n = require('./helpers/i18n');
  i18n(i, $);

  if (typeof user === "undefined") {
    $('.userBar').remove();
    var out = $.html();
    out = out.replace('{{hook}}', JSON.stringify(boot, true, 2));
    return callback(null, out);
  } else {
    user = user.toLowerCase();
    var query = { name: user };
    return userResource.find(query, function(err, results){
      if (err) {
        return res.end(err.message);
      }
      if (results.length === 0) {
        $('.userBar').remove();
        var out = $.html();
        out = out.replace('{{hook}}', JSON.stringify(boot, true, 2));
        return callback(null, out);
        // return res.end('Unable to find user. This error should never happen. Please contact hookmaster@hook.io immediately.');
      } else {
        // do nothing
      }
      var u = results[0];
      $('.userBar .welcome').html(i.__('Welcome') + ' <strong>' + user + "</strong>!")
      $('.loginBar').remove();
      $('.featuresDiv').remove();
      $('.hookStats').remove();
      // $('.tagline').remove();
      $('.yourHooks').attr("href", "/" + user);
      // $('.splash').remove();
      var out = $.html();
      out = out.replace('{{hook}}', JSON.stringify(boot, true, 2));
      return callback(null, out);
    });
  }

};