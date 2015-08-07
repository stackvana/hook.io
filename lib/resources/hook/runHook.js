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
     hook.attemptToRequireUntrustedHook(opts, function(err, untrustedService) {
       if (err) {
         // opts.res.writeHead(500);
         return opts.res.end(hook.formatError(err).message)
       }
       // console.log('attemptToRequireUntrustedHook',req.params)
       hook.preprocessHook(opts, untrustedService, function(err, untrustedService) {
         if (err) {
           // opts.res.writeHead(500);
           return opts.res.end(hook.formatError(err).message)
         }
         hook.fetchHookTheme(opts, untrustedService.theme, function(err, _theme){
           if (err) {
             // opts.res.writeHead(500);
             return opts.res.end(hook.formatError(err).message)
           }
           // console.log('fetchHookTheme',req.params)
           hook.fetchHookPresenter(opts, untrustedService.presenter, function(err, _presenter){
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

             hook.validateServiceInput(untrustedService, req, req, function (err, instance){
               if (err) {
                 return opts.res.end(hook.formatError(err).message)
               }
               req.resource.instance = instance;

               // overwite schema as it might be pulling previous version from database or cache
               // if a schema is specified on the Hook module exports itself, it always should take precedence
               // req.hook.mschema = untrustedService.schema || {};
               if (req.view && req.presenter && req.resource.params.format !== "raw") {
                 hook.renderView(untrustedService, req, res, function (err, input, output){
                   _runHook(req, output);
                 });
               } else {
                 _runHook(req, res);
               }

               function _runHook(input, output) {
                 function _errorHandler (err) {
                   err = formatError(err);
                   return output.end(err.message);
                 }
                 // spawn hook service as child process in chroot jail
                 // TODO: generate one-time use keys for datastore and cache on spawn
                 hook.spawnService(untrustedService, req, output);
                 return hook.postprocessHook(err, opts, untrustedService);
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