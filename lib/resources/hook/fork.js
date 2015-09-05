var GitHubApi = require('github');

module['exports'] = function forkHook (req, res) {
  
  var github = new GitHubApi({
      // required
      version: "3.0.0",
      // optional
      debug: false,
      protocol: "https",
      host: "api.github.com",
      requestFormat: "json",
      timeout: 5000
  });

    var opts;
    var hook = require('./');
    if (!req.isAuthenticated()) {
      req.session.redirectTo = "/" + req.params.owner + "/" +  req.params.hook + "?fork=true";
      return res.redirect(302, '/login');
    }

    var query = { owner: req.params.owner, name: req.params.hook };
    return hook.find(query, function(err, result){
      if (err) {
        return res.end(err.message);
      }
      if (result.length === 0) {
        return res.end('No Hook Found!');
      }

      var h = result[0];
      req.hook = result[0];

      var userScript =  h.gist.replace('https://gist.github.com/', '');
      userScript = userScript.replace('/', ' ');
      var parts  = userScript.split(" ");
      var username = parts[0],
          script = parts[1];

      if (req.user.username === username) {
        return res.end('You cannot fork your own Hooks. Try creating a new Hook instead? https://hook.io/new');
      }

      // before we fork, check if hook already exists by that name, if return error
      hook.find({ owner: req.user.username, name: h.name }, function(err, result){
        if (err) {
          return res.end(err.message);
        }
        if(result.length > 0) {
          return res.end("You've already forked this Hook at " + "https://hook.io/" + req.user.username + "/" + h.name);
        }
        forkScript();
      })
      
      function forkScript () {
        // authenticate github API
        if (typeof req.user.accessToken === "undefined") {
          return res.end('No Github user token is available. Unable to use Github API.');
        }

        github.authenticate({
            type: "oauth",
            token: req.user.accessToken
        });

        var _script = script + ".js";
        return github.gists.fork({
          id: script,
          }, function(err, rest) {
            if (err) {
              return res.end(err.message);
            }
            var _hook = {
              owner: req.user.username,
              name: h.name,
              gist: rest.owner.html_url.replace('https://github.com/', 'https://gist.github.com/') + "/" + rest.id
            };
            return hook.create(_hook, function(err, result){
              if (err) {
                return callback(err.message);
              }
              var h = result;
              opts = opts || {};
              opts.gist = h.gist;
              opts.req = req;
              opts.res = res;
              hook.fetchHookSourceCode(opts, function(err, code){
                if (err) {
                  return opts.res.end(err.message);
                }
                hook.attemptToRequireUntrustedHook(opts, function(err, _module){
                  if (err) {
                    return opts.res.end(hook.formatError(err).message)
                  }
                  h.mschema = _module.schema;
                  h.theme = _module.theme;
                  h.presenter = _module.presenter;
                  h.save(function(){
                    // redirect to new fork friendly page
                    return res.redirect('/' + h.owner + "/" + h.name + "?forked=true");
                    });
                });
              });
            });
          });
        };
    });
};