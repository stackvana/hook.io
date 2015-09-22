var request = require('hyperquest');
var log = require("../log");
var cache = require("../cache");
var Datastore = require("../datastore").Datastore;
var formatError = require("./formatError");
var themes = require('../themes');
var config = require('../../../config');

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
  // TODO: clean up execution chain, normalize error handlers,
  // put entire sequence into async iterator

  // execute hook
  hook.fetchHookSourceCode(opts, function(err, code) {
     if (err) {
       // opts.res.writeHead(500);
       return opts.res.end(hook.formatError(err).message)
     }
     // console.log('fetchHookSourceCode', code);
     //opts.req.hook.source = code;
     hook.attemptToRequireUntrustedHook(opts, function (err, untrustedModule) {
       if (err) {
         // opts.res.writeHead(500);
         return opts.res.end(hook.formatError(err).message)
       }
       // console.log('attemptToRequireUntrustedHook', untrustedModule, untrustedModule.exports)
       untrustedService.mschema = untrustedModule.exports.schema || h.mschema || {};
       untrustedService.evalSource = untrustedModule.exports.toString();

       if (h.language === "javascript") {
         h.source = "module['exports'] = " + untrustedService.evalSource + ";";
       }

       untrustedService.sourceType = h.sourceType;

       // console.log('attemptToRequireUntrustedHook',req.params)
       hook.preprocessHook(opts, untrustedService, function(err, untrustedService) {
         if (err) {
           // opts.res.writeHead(500);
           return opts.res.end(hook.formatError(err).message)
         }

         // default to javascript
         untrustedService.language = req.hook.language || "javascript";
         untrustedService.presenter = req.hook.presenter || config.defaultPresenter;

         var _theme = h.theme,
             _presenter = untrustedService.presenter;

         if (opts.req._themeOverride === true) {
           _theme = themes[opts.req.resource.params.theme].theme;
           _presenter = themes[opts.req.resource.params.theme].presenter;
         }

         hook.fetchHookTheme(opts, _theme, function(err, _theme){
           if (err) {
             // opts.res.writeHead(500);
             return opts.res.end(hook.formatError(err).message)
           }
           untrustedService.themeSource = _theme;
           hook.fetchHookPresenter(opts, _presenter, function(err, _presenter){
             if (err) {
               // opts.res.writeHead(500);
               return opts.res.end(hook.formatError(err).message)
             }
             untrustedService.presenterSource = _presenter;
             //req.view = _theme;
             //req.presenter = _presenter;

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
               // console.log('what is h?', h)
               if (h.themeStatus === "enabled" || opts.req._themeOverride === true) { // TODO: better none theme detection, actually don't use any theme at all
                 // console.log('render view', untrustedService)
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

                 if (req.saveHook === true) {
                   delete req.hook._rev;
                   hook.update(req.hook, function (err, result) {
                     // TODO: update cache?
                     if (err) {
                       return res.end(err.message);
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
                   // TODO: generate one-time use keys for datastore and cache on spawn
                   hook.spawnService(untrustedService, req, output);
                   return hook.postprocessHook(err, opts, untrustedService);
                   // TODO: hook.postprocessHook(err, opts, userModule);
                   // TODO: where is callback now?
                 }
               }
             });
           });
         });
       });
     });
   });
}