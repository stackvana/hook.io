var request = require('hyperquest');
var log = require("../log");
var user = require("../user");
var cache = require("../cache");
var metric = require("../metric");
var events = require('../events');
var Datastore = require("../datastore").Datastore;
var formatError = require("./formatError");
var themes = require('../themes');
var config = require('../../../config');
var checkRoleAccess = require('../../server/routeHandlers/checkRoleAccess');

module['exports'] = function runHook (opts, callback) {
  var hook = require('./');
  opts = opts || {};
  var req = opts.req;
  var res = opts.res;

  var gist = req.resource.params.gist;
  var params = req.resource.params;
  opts.gist = params.gist;
  opts.params = params;

  var h = req.hook;
  var untrustedService = {};
  untrustedService.name = h.name;
  untrustedService.owner = h.owner;
  untrustedService.schema = {};
  untrustedService.hookType = h.hookType || "service";
  untrustedService.customTimeout = h.customTimeout || config.UNTRUSTED_HOOK_TIMEOUT;
  // TODO: clean up execution chain, normalize error handlers,
  // put entire sequence into async iterator

  function loadViewPresenter (untrustedService, _theme, _presenter, cb) {
    // console.log('pre fetchHookTheme', _theme);
    hook.fetchHookTheme(opts, _theme, function(err, _theme){
      // console.log('post fetchHookTheme', err);
      if (err) {
        return opts.res.end(hook.formatError(err, { tag: 'fetchHookTheme' }).message)
      }
      hook.fetchHookPresenter(opts, _presenter, function(err, _presenter){
        if (err) {
         return opts.res.end(hook.formatError(err, { tag: 'fetchHookPresenter' }).message)
        }
        untrustedService.presenterSource = _presenter;
        // TODO: replace with request scope?
        //req.view = _theme;
        //req.presenter = _presenter;
        cb(null, untrustedService)
      });
    });
  };

  function validateAndRunHook (opts, cb) {
    hook.validateServiceInput(untrustedService, req, req, function (err, validated) {
      //console.log('post validateServiceInput', err);
      if (err) {
        // changes format of validation errors as of 8/25/16
        // return opts.res.end(hook.formatError(err).message)
        return opts.res.json(err);
      }
      if (validated.valid === false) {
        return opts.res.json(validated.errors);
      } else {
        req.resource.instance = validated.instance;
      }
      // Remark: Is this schema code still needed?
      // overwite schema as it might be pulling previous version from database or cache
      // if a schema is specified on the Hook module exports itself, it always should take precedence
      // req.hook.mschema = untrustedService.schema || {};
      _runHook(req, res);

      // Remark: Theme override code has been disabled here?
      /*
      if (h.themeStatus === "enabled" || opts.req._themeOverride === true) { // TODO: better none theme detection, actually don't use any theme at all
        console.log('rendering with view'.yellow, untrustedService)
        hook.viewPresenter(untrustedService, req, res, function (err, input, output){
          _runHook(req, output);
        });
      } else {
        // console.log('rendering without view', untrustedService)
      }
      */

      function _runHook (input, output) {
        events.emit('hook::run', {
          name: req.hook.name,
          owner: req.hook.owner,
          ip: input.connection.remoteAddress,
          url: req.url
        });
        function _errorHandler (err) {
          err = formatError(err);
          return output.end(err.message);
        }

        if (req.saveHook === true) {
          delete req.hook._rev;
          req.hook.source = req.hook.originalSource;
          //delete req.hook.originalSource;
          //console.log('updating and saving', req.hook)
          hook.update(req.hook, function (err, result) {
            // TODO: update cache?
            if (err) {
              // ignore document update error messages for now
              // TODO: fix this
              // return res.end(err.message);
              console.log('could not save hook', err.message);
              console.log('error spawn')
              return _spawn();
            }
            var key = '/hook/' + req.hook.owner + "/" + req.hook.name;
            cache.set(key, result, function(){
              _spawn();
            });
          });
        } else {
          _spawn();
        }

        function _spawn () {
          // spawn hook service as child process in chroot jail
          // Remark: Special case for hot-code gateways
          // This is needed in order to scope the hot-code gateway to the logged in session user
          // All hot-code gateways are currently owned by user "marak"
          // We could have each user fork the hot-code gateways to mitigate this issue ( since it's just a hook),
          // but that wouldn't be very convenient for the users
          if (untrustedService.owner === "marak" && (untrustedService.hookType === "gateway")) {
            req.env = {};

            /*
            // this anonymous undefined check seems out of place
            // we should probably be performing this higher in the processing chain
            if (typeof req.session.user === "undefined") {
              req.session.user = "anonymous";
            }

            // give anonymous users a fixed env ( we could configure this later )
            if (req.session.user === "anonymous") {
              req.env = {
                "anonymous-env-param1": "foo",
                "anonymous-env-param2": "bar"
              };
              return _finishSpawn();
            }
            */

            // TODO: should this be using user cache? performance increase for sure
            // if a user session exists, attempt to lookup env for that user
            // this will scope the hot-code gateway to the user's env
            if (typeof req.headers === "object" && typeof req.headers["x-hookio-user-session-name"] === "string" && req.headers["x-hookio-user-session-name"].length > 0) {
              var _name = req.headers["x-hookio-user-session-name"];
              user.find({ name: _name }, function (err, _user){
                if (err) {
                  return res.end(err.message);
                }
                if (_user.length === 0) {
                  return res.end('Could not find user ' + _name + '. Please contact support.');
                }
                var u = _user[0];
                req.env = u.env || {};
                req.env.hookAccessKey = u.hookAccessKey;
                // TODO: refactor out key sorting into resource library
                var keys = Object.keys(req.env).sort();
                var __env = {};
                keys.forEach(function(k){
                  __env[k] = req.env[k];
                });
                req.env = __env;
                return _finishSpawn();
              })
            } else {
              return _finishSpawn();
            }
          } else {
            req.env.hookAccessKey = req._user.hookAccessKey;
            return _finishSpawn();
          }
          function _finishSpawn () {

            /*
            if (typeof untrustedService.code === "undefined" && typeof untrustedService.evalSource === "string") {
              untrustedService.code = untrustedService.evalSource;
            }
            */

            // Remark: Build new config object with only untrusted configuration values
            var _config = {
              SERVICE_MAX_TIMEOUT: config.UNTRUSTED_HOOK_TIMEOUT,
              messages: config.messages
            }
            untrustedService.config = _config;
            untrustedService.isHookio = true;
            hook.spawnService(untrustedService)(req, output, function _serviceEnded (err, result) {
              // console.log('service has ended', err, result);
              //
              // This is the callback for when the service has actually ended ( output has ended / next has been called from stack.spawn )
              //

              //
              // Note: It's important we deincrement the /running count for the user
              //       as this value is used to determine max concurrency of services
              //
              metric.incrby("/" + req.params.owner + "/running", -1);
              callback(null, 'service complete');
            });
            // This is a fire-and-forget method, will not wait for service to end
            return hook.postprocessHook(err, opts, untrustedService);
          }
        }
      }
    });
  }


  function _execute () {
    // execute hook
    hook.fetchHookSourceCode(opts, function (err, code) {
       if (err) {
         // opts.res.writeHead(500);
         return opts.res.end(hook.formatError(err).message)
       }

       if (typeof code === "undefined") {
         return res.end('runhook Error: Unable to fetch hook source. We made a mistake. Please contact support.');
       }

       //opts.req.hook.source = code;
       hook.attemptToRequireUntrustedHook(opts, function (err, untrustedModule) {
         if (err) {
           return opts.res.end(hook.formatError(err).message)
         }

         // do not perform this mapping for any of the target languages that will require code generation
         var requiresDataDefinitionGeneration = ['lua', 'perl', 'scheme', 'tcl'];

         if (requiresDataDefinitionGeneration.indexOf(h.language) === -1) {
           for (var p in hook.schema.properties) {
             var val = h[p];
             untrustedService[p] = val;
           }
         } else {
           // do not populate resource object with additional values
           // since we are using these values to populate hook.resource inside the service...
           // and we are also auto-generating code definitions for multiple programming target languages...
           // we must ensure that all values are going to be strings ( since some of our other non-javascript languages arent yet able to handle any types outside of string )
         }

         // we can remove some of these ?
         untrustedService.schema = untrustedModule.exports.schema || h.mschema || {};
         untrustedService.mschema = untrustedModule.exports.schema || h.mschema || {};
         untrustedService.code = untrustedModule.exports.toString();

         // TODO: cleanup schema / mschema references
         req.hook.schema = untrustedService.schema;
         req.hook.mschema = untrustedService.schema;

         untrustedService.sourceType = h.sourceType;

         // console.log('attemptToRequireUntrustedHook',req.params)
         hook.preprocessHook(opts, untrustedService, function(err, untrustedService) {
           if (err) {
             // opts.res.writeHead(500);
             return opts.res.end(hook.formatError(err).message)
           }

           // default to javascript
           untrustedService.language = req.hook.language || "javascript";
           untrustedService.presenter = req.hook.presenter || "";
           var _theme = h.theme,
               _presenter = untrustedService.presenter;

           if (opts.req._themeOverride === true) {
             // at this point we should have already checked that this key ( theme name ) is valid
             _theme = themes[opts.req.resource.params.theme].theme;
             _presenter = themes[opts.req.resource.params.theme].presenter;
           }

           if (req.hook.themeStatus === "enabled" || opts.req._themeOverride === true) {
             loadViewPresenter(untrustedService, _theme, _presenter, function(err, untrustedService){
               if (err) {
                 return res.end(err.message);
               }
               if (req.view && req.presenter && req.resFormat !== "raw") {
                 req.resFormat = "friendly";
               }
               validateAndRunHook(opts, callback);
             });
           } else {
             validateAndRunHook(opts, callback);
           }
         });
       });
     });
  }

  // TODO: move jsonResponse check to a more generalized location
  var acceptTypes = [];

  if (req.headers && req.headers.accept) {
    acceptTypes = req.headers.accept.split(',');
  }
  if (acceptTypes.indexOf('text/html') === -1) {
    req.jsonResponse = true;
  }

  checkRoleAccess({ req: req, res: res, role: "hook::run" }, function (err, hasPermission) {
    // only protect running of private hooks
    if (h.isPrivate !== true) {
      hasPermission = true;
    }
    if (!hasPermission) {
      //runHook();
      return res.end(config.messages.unauthorizedRoleAccess(req, "hook::run"));
    } else {
      _execute();
    }
  });

}