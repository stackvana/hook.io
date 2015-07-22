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
             opts.theme = _theme;
             opts.presenter = _presenter;
             hook.runUntrustedHook(opts, userModule, function(err, result){
               callback(err, result);
               // Remark: Not a typo. The hook is post-processed with a "fire and forget" callback.
               // "callback" is responsible for handling the output of runHook
               hook.postprocessHook(err, opts, userModule);
             });
           });
         });
       });
     });
   });
}