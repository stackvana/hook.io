var hook = require("../lib/resources/hook");
var hooks = require("hook.io-hooks");
var bodyParser = require('body-parser');
var mergeParams = require('merge-params');
var config = require('../config');
var themes = require('../lib/resources/themes');
var hooks = require('hook.io-hooks');


module['exports'] = function view (opts, callback) {
  var req = opts.request,
      res = opts.response;

  var $ = this.$,
  self = this;

  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/new";
    return res.redirect('/login');
  }

  var user = req.session.user;

  var boot = {
    owner: user
  };

  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});
    var params = req.resource.params;
    var gist = params.gist;

    if (req.method === "POST") {

      if (params.name.length === 0) {
        return res.end('Hook name is required!');
      }

      // do not recreate hooks that already exist with that name
      params.owner = user || "Marak"; // hardcode Marak for testing
      
      if (typeof params.theme === 'string' && params.theme.length === 0) {
        delete params.theme;
      }
      if (typeof params.presenter === 'string' && params.presenter.length === 0) {
        delete params.presenter;
      }

      var query = { name: params.name, owner: req.session.user };
      return hook.find(query, function(err, results){
        if (results.length > 0) {
          var h = results[0];
          return res.end('Hook already exists ' + '/' + h.owner + "/" + h.name);
          //return res.redirect('/' + h.owner + "/" + h.name + "?alreadyExists=true");
        }
        params.cron = params.cronString;
        if (params.hookSource === "editor") {
            delete params.gist;
            params.source = params.codeEditor;
        }

        // TODO: filter params for only specified resource fields?
        return hook.create(params, function(err, result){
          if (err) {
            return callback(null, err.message);
          }

          var h = result;
          req.hook = h;

          if (params.hookSource === "editor") {
             // the source of the hook is coming from the code editor
             return res.redirect('/' + h.owner + "/" + h.name + "");
          } else {
            // the source of the hook is coming from a github gist
            opts.gist = gist;
            opts.req = opts.request;
            opts.res = opts.response;
            // fetch the hook from github and check if it has a schema / theme
            // if so, attach it to the hook document
            // TODO: can we remove this? it seems like this logic should be in the Hook.runHook execution chain...
            hook.fetchHookSourceCode(opts, function(err, code){
              if (err) {
                return opts.res.end(err.message);
              }
              hook.attemptToRequireUntrustedHook(opts, function(err, _module){
                if (err) {
                  return opts.res.end(err.message)
                }
                h.mschema = _module.schema;
                h.theme = _module.theme;
                h.presenter = _module.presenter;
                h.save(function(){
                  // redirect to new hook friendly page
                  return res.redirect('/' + h.owner + "/" + h.name + "");
                  //return callback(null, JSON.stringify(result, true, 2));
                });
              });
            });
          }
        });
      });
    }

    if (typeof req.session.gistLink === 'string') {
      // todo: after created, unset gistSource so it doesn't keep popping up
      $('.gist').attr('value', req.session.gistLink);
    } else {
      $('.gistStatus').remove();
    }

    var services = hooks.services;
    var examples = {};

    // pull out helloworld examples for every langauge
    hook.languages.forEach(function(l){
      examples[l] = services['examples-' + l + '-helloworld'];
    });

    boot.examples = examples;

    /*
    for (var e in examples) {
      for (var code in examples[e]) {
        // $('.services').append(examples[e][code]);
      }
    }
    */

    self.parent.components.themeSelector.present({}, function(err, html){
      var el = $('.themeSelector')
      el.html(html);
      var out = $.html();
      out = out.replace('{{hook}}', JSON.stringify(boot, true, 2));
      callback(null, out);
    })

  });

};