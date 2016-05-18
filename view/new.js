var hook = require("../lib/resources/hook");
var hooks = require("hook.io-hooks");
var psr = require('parse-service-request');
var config = require('../config');
var themes = require('../lib/resources/themes');
var hooks = require('hook.io-hooks');
var resource = require('resource');
var checkRoleAccess = require('../lib/server/routeHandlers/checkRoleAccess');

module['exports'] = function view (opts, callback) {
  var req = opts.request,
      res = opts.response;

  var $ = this.$,
  self = this;

  var appName = req.hostname;

  var user, boot;

  var params;
  psr(req, res, function(req, res, fields){
    params = req.resource.params;
    for (var p in fields) {
      params[p] = fields[p];
    }

    // TODO: move to resource.before hooks...maybe not. better to avoid the pre-processing logic...
    checkRoleAccess({ req: req, res: res, role: "hook::create" }, function (err, hasPermission) {

      if (!hasPermission /* || req.resource.owner === "anonymous" */ ) { // don't allow anonymous hook creation
        if (req.jsonResponse !== true && typeof params.hook_private_key === "undefined") {
          req.session.redirectTo = "/new";
          return res.redirect('/login');
        }
        return res.end(config.messages.unauthorizedRoleAccess(req, "hook::create"));
      } else {
        user = req.resource.owner;
        boot = {
          owner: user
        };
        finish();
      }
    });

    /*
    } else {
      if (!req.isAuthenticated()) { 
        req.session.redirectTo = "/new";
        if (req.jsonResponse === true) {
          return res.end(config.messages.unauthorizedRoleAccess(req, "hook::create"));
        }
        return res.redirect('/login');
      }
      finish();
    }
    */
  });

  function finish () {
    $('title').html(appName + ' - Create new Service');

      var gist = params.gist;

      if (req.method === "POST" && typeof params.scaffold === "undefined") {

        if (typeof params.name === 'undefined' || params.name.length === 0) {

          var msg = 'Service name is required!';
          if (req.jsonResponse === true) {
            msg = {
              error: true,
              message: msg,
              property: 'name',
              constraint: "required",
              required: true,
              actual: false
            };
            return res.end(JSON.stringify(msg, true, 2));
          } else {
            return res.end(msg);
          }

        }

        // do not recreate hooks that already exist with that name
        params.owner = user || "Marak"; // hardcode Marak for testing

        if (typeof params.theme === 'string' && params.theme.length === 0) {
          delete params.theme;
        }
        if (typeof params.presenter === 'string' && params.presenter.length === 0) {
          delete params.presenter;
        }

        if (typeof params.hookSource === "undefined") {
          params.hookSource = "code";
        }

        if (params.isPrivate === true) {
          params.isPrivate = true;
        } else {
          params.isPrivate = false;
        }

        params.sourceType = params.hookSource;

        if (params.themeActive) {
          params.themeStatus = "enabled";
        }

        var query = { name: params.name, owner: req.resource.owner };
        //var query = { name: params.name, owner: req.session.user };
        return hook.find(query, function (err, results) {
          if (results.length > 0) {
            var h = results[0];
            var msg = 'Hook already exists ' + '/' + h.owner + "/" + h.name;
            if (req.jsonResponse === true) {
              msg = {
                error: true,
                message: msg,
                type: "duplicate-key"
              };
              return res.end(JSON.stringify(msg, true, 2));
            } else {
              return res.end(msg);
            }
            //return res.redirect('/' + h.owner + "/" + h.name + "?alreadyExists=true");
          }
          params.cron = params.cronString;

          if (params.hookSource === "code") {
            delete params.gist;
            params.source = params.source || params.codeEditor;
            if (typeof params.source === "undefined") {
              params.source = "module['exports'] = function (hook) {hook.res.end('no source code provided')};";
            }
          }

          // TODO: filter params for only specified resource fields?
          return hook.create.call({ req: req, res: res }, params, function(err, result){

            if (err) {
              return callback(null, err.message);
            }

            var h = result;
            req.hook = h;

             resource.emit('hook::created', {
               ip: req.connection.remoteAddress,
               owner: params.owner,
               name: params.name
             });

            // the source of the hook is coming from the code editor
            if (params.hookSource === "code") {
               // if jsonResponse, return object
               if (req.jsonResponse) {
                 return res.json({ status: 'created', hook: result });
               } else {
                 // if not, redirect to admin page for newly created hook
                 return res.redirect('/admin?owner=' + h.owner + "&name=" + h.name + "&status=created");
               }
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

      if (req.session.paidStatus === "paid") {
        $('.paidAccount').remove();
      } else {
        $('.securityHolder input').attr('disabled', 'DISABLED')
      }

      if (typeof req.session.tempSource !== "undefined") {
        $('.codeEditor').html(req.session.tempSource);
        // keep or destroy? maybe present option as clipboard in session?
        // better to keep delete for now...is causing issue with examples
        delete req.session.tempSource;
      }

      if (typeof req.session.tempLang === "string") {
        // TODO: better default databinding ( instead of prepend ) in boot
        $('#language').prepend('<option value="' + req.session.tempLang +'">' + req.session.tempLang + '</option>');
        $('#gatewayForm').attr('action', config.app.url + '/marak/gateway-' + req.session.tempLang);
        delete req.session.tempLang;
      }

      var services = hooks.services;
      var examples = {};

      // pull out helloworld examples for every langauge
      hook.languages.forEach(function(l){
        examples[l] = services['examples-' + l + '-hello-world'];
      });

      var i18n = require('./helpers/i18n');
      var i = req.i18n;
      i18n(i, $);

      for (var s in services) {
        var e = services[s];
        var type = s.split('-')[0], 
            lang = s.split('-')[1];
        if (type === "examples" && lang === "javascript") {
          $('.selectSnippet').prepend('<option value="' + 'marak/' + s + '">' + e.description + '</option>')
        }
      }

      boot.examples = examples;

      /*
      for (var e in examples) {
        for (var code in examples[e]) {
          // $('.services').append(examples[e][code]);
        }
      }
      */

      self.parent.components.themeSelector.present({ request: req, response: res }, function(err, html){
        var el = $('.themeSelector')
        el.html(html);
        $ = req.white($);
        var out = $.html();
        out = out.replace('{{hook}}', JSON.stringify(boot, true, 2));
        callback(null, out);
      });

  }

};

module['exports'].schema = {
  "name": {
    "type": "string",
    "required": true
  },
  "path": {
    "type": "string"
  },
  "isPrivate": {
    "type": "boolean",
    "default": false
  },
  "source": {
    "type": "string",
    "required": false
  }
};