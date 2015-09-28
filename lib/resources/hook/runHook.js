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
  untrustedService.name = h.name;
  untrustedService.owner = h.owner;
  untrustedService.schema = {};

  // TODO: clean up execution chain, normalize error handlers,
  // put entire sequence into async iterator

  // execute hook
  hook.fetchHookSourceCode(opts, function (err, code) {
     if (err) {
       // opts.res.writeHead(500);
       return opts.res.end(hook.formatError(err).message)
     }

     if (typeof code === "undefined") {
       return res.end('Error: Unable to fetch hook source. We made a mistake. Please contact support.');
     }

     //opts.req.hook.source = code;
     hook.attemptToRequireUntrustedHook(opts, function (err, untrustedModule) {
       if (err) {
         // opts.res.writeHead(500);
         return opts.res.end(hook.formatError(err).message)
       }
       // console.log('attemptToRequireUntrustedHook', untrustedModule)

       // TODO: cleanup schema / mschema references
       // we can remove some of these
       untrustedService.schema = untrustedModule.exports.schema || h.mschema || {};
       untrustedService.mschema = untrustedModule.exports.schema || h.mschema || {};
       untrustedService.evalSource = h.source.toString();
       req.hook.schema = untrustedService.schema;
       req.hook.mschema = untrustedService.schema;

       if (h.language === "javascript") {
         h.source = "module['exports'] = " + untrustedService.evalSource + ";";
       }

       // console.log('untrustedService', untrustedService)

       untrustedService.sourceType = h.sourceType;

       console.log('attemptToRequireUntrustedHook',req.params)
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
           // at this point we should have already checked that this key ( theme name ) is valid
           _theme = themes[opts.req.resource.params.theme].theme;
           _presenter = themes[opts.req.resource.params.theme].presenter;
         }
         // console.log('pre fetchHookTheme', _theme);
         hook.fetchHookTheme(opts, _theme, function(err, _theme){
           // console.log('post fetchHookTheme', err);
           if (err) {
             // opts.res.writeHead(500);
             return opts.res.end(hook.formatError(err).message)
           }
           untrustedService.themeSource = _theme;
           //console.log('pre fetchHookPresenter', _presenter);
           hook.fetchHookPresenter(opts, _presenter, function(err, _presenter){
             //console.log('post fetchHookPresenter');
             if (err) {
               // opts.res.writeHead(500);
               return opts.res.end(hook.formatError(err).message)
             }
             untrustedService.presenterSource = _presenter;
             //req.view = _theme;
             //req.presenter = _presenter;

             if (req.view && req.presenter && req.resFormat !== "raw") {
               req.resFormat = "friendly";
             }

             hook.validateServiceInput(untrustedService, req, req, function (err, instance) {
               // console.log('post validateServiceInput');
               if (err) {
                 return opts.res.end(hook.formatError(err).message)
               }
               req.resource.instance = instance;

               // overwite schema as it might be pulling previous version from database or cache
               // if a schema is specified on the Hook module exports itself, it always should take precedence
               // req.hook.mschema = untrustedService.schema || {};
               // console.log('what is h?', h)
               if (h.themeStatus === "enabled" || opts.req._themeOverride === true) { // TODO: better none theme detection, actually don't use any theme at all
                 // console.log('rendering with view', untrustedService)
                 hook.renderView(untrustedService, req, res, function (err, input, output){
                   _runHook(req, output);
                 });
               } else {
                 // console.log('rendering without view', untrustedService)
                 _runHook(req, res);
               }

               function _runHook(input, output) {

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