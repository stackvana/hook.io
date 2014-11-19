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
       throw err;
     }
     // console.log('fetchHookSourceCodeFromGithub',req.params)
     hook.attemptToRequireUntrustedHook(opts, function(err, untrustedModule){
       if (err) {
         opts.res.writeHead(500);
         return opts.res.end(hook.formatError(err))
       }
       // console.log('attemptToRequireUntrustedHook',req.params)
       hook.preprocessHook(opts, untrustedModule, function(err, userModule) {
         hook.fetchHookTheme(userModule.theme, function(err, _theme){
           if (err) {
             throw err;
           }
           // console.log('fetchHookTheme',req.params)
           hook.fetchHookPresenter(userModule.presenter, function(err, _presenter){
             // console.log('fetch presenter')
             if (err) {
               return opts.res.end(hook.formatError(err));
             }
             // console.log('fetchHookPresenter',req.params)
             opts.theme = _theme;
             opts.presenter = _presenter;
             hook.runUntrustedHook(opts, userModule, function(err, result){
               if (err) {
                 return opts.res.end(hook.formatError(err));
               }
               callback(err, result);
               
               hook.postprocessHook(err, opts, userModule);
             });
           });
         });
       });
     });
   });
}