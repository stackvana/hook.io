var request = require('hyperquest');
var log = require("../log");
var Datastore = require("../datastore").Datastore;
var formatError = require("./formatError");

module['exports'] = function runHook (opts, callback) {
  var hook = require('./');
  opts = opts || {};
  var req = opts.req;
  var res = opts.res;

  var gist = req.resource.params.gist;
  var params = req.resource.params;
  opts.gist = params.gist;
  opts.params = params;

  // TODO: clean up execution chain, normalize error handlers,
  // put entire sequence into async iterator

  // execute hook
  hook.fetchHookSourceCodeFromGithub(opts, function(err, code) {
     if (err) {
       // opts.res.writeHead(500);
       return opts.res.end(hook.formatError(err).message)
     }
     // console.log('fetchHookSourceCodeFromGithub',req.params)
     hook.attemptToRequireUntrustedHook(opts, function(err, untrustedModule) {
       if (err) {
         // opts.res.writeHead(500);
         return opts.res.end(hook.formatError(err).message)
       }
       // console.log('attemptToRequireUntrustedHook',req.params)
       hook.preprocessHook(opts, untrustedModule, function(err, userModule) {
         if (err) {
           // opts.res.writeHead(500);
           return opts.res.end(hook.formatError(err).message)
         }
         hook.fetchHookTheme(opts, userModule.theme, function(err, _theme){
           if (err) {
             // opts.res.writeHead(500);
             return opts.res.end(hook.formatError(err).message)
           }
           // console.log('fetchHookTheme',req.params)
           hook.fetchHookPresenter(opts, userModule.presenter, function(err, _presenter){
             if (err) {
               // opts.res.writeHead(500);
               return opts.res.end(hook.formatError(err).message)
             }
             // console.log('fetchHookPresenter',req.params)
             req.view = _theme;
             req.presenter = _presenter;

             if (req.view && req.presenter && req.resource.params.format !== "raw") {
               req.resource.params.format = "friendly";
             }

             hook.validateServiceInput(req, req, function (err, instance){
               if (err) {
                 return opts.res.end(hook.formatError(err).message)
               }
               req.resource.instance = instance;

               // overwite schema as it might be pulling previous version from database or cache
               // if a schema is specified on the Hook module exports itself, it always should take precedence
               req.hook.mschema = userModule.schema || {};
               if (req.view && req.presenter && req.resource.params.format !== "raw") {
                 hook.renderView(req, res, function (err, input, output){
                   _runHook(req, output);
                 });
               } else {
                 _runHook(req, res);
               }

               function _runHook(input, output) {
                 req.untrustedHook = userModule;
                 var _env = {};

                 var debugOutput = [];

                  // A simple debug utility for inspecting data from inside a running hook
                  var debug = function debug (arg) {
                    // create log entry
                    var entry = {
                      time: new Date(),
                      data: JSON.stringify(arg),
                      ip : req.connection.remoteAddress
                    };
                    // push entry to log datasource
                    log.push("/" + req.hook.owner + "/" + req.hook.name, entry, function(err, res) {
                      if (err) {
                        console.log('Error pushing log entry to datasource! ', err.message);
                      }
                    });
                    // push entry into temporary buffer for use in immediate request response
                    debugOutput.push(entry);
                  };

                 _env.debug = debug;
                 _env.params = req.resource.instance;
                 var _vm = {};
                 _vm.console = { log: debug };
                 _vm.rconsole = console;
                  _vm.require = require;
                 function _errorHandler (err) {
                   err = formatError(err);
                   return output.end(err.message);
                 }

                 // spawn hook service as child process in chroot jail
                 // TODO: generate one-time use keys for datastore and cache on spawn
                 hook.spawnService(userModule, req, output);
                 return hook.postprocessHook(err, opts, userModule);
                 // TODO: hook.postprocessHook(err, opts, userModule);
                 // TODO: where is callback now?
               }
             });
           });
         });
       });
     });
   });
}