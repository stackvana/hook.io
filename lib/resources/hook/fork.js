var GitHubApi = require('github');
var config = require('../../../config');

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
      req.session.redirectTo = "/" + req.params.owner + "/" +  req.params.hook + "/fork";
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

      var sourceType = "gist";

      // TODO: allow forking of non-github gists! easy.
      if (typeof h.gist === "undefined" || h.gist.length === 0) {
        sourceType = "hook";
        // return res.end('Sorry, this hook is not backed by a Github Gist. Forking is not currently available for non-Github based Hooks.');
      }

      if (req.session.user === h.owner) {
        return res.end('You cannot fork your own Hooks. Try creating a new Hook instead? https://hook.io/new');
      }

      // before we fork, check if hook already exists by that name, if return error
      hook.find({ owner: req.session.user, name: h.name }, function (err, result) {
        if (err) {
          return res.end(err.message);
        }
        if(result.length > 0) {
          return res.end("You've already forked this Hook at " + config.app.url + "/" + req.session.user + "/" + h.name);
        }
        forkScript(h);
      });
      // TODO: better forking support / choose where to fork to
      // add UI screen for forking
      /*
      if (sourceType === "gist") {
        var userScript =  h.gist.replace('https://gist.github.com/', '');
        userScript = userScript.replace('/', ' ');
        var parts  = userScript.split(" ");
        var username = parts[0],
            script = parts[1];

        if (req.session.user === username) {
          return res.end('You cannot fork your own Hooks. Try creating a new Hook instead? https://hook.io/new');
        }

        // before we fork, check if hook already exists by that name, if return error
        hook.find({ owner: req.session.user, name: h.name }, function(err, result){
          if (err) {
            return res.end(err.message);
          }
          if(result.length > 0) {
            return res.end("You've already forked this Hook at " + config.app.url + "/" + req.session.user + "/" + h.name);
          }
          forkGithubScript();
        });
      } else {

        if (req.session.user === username) {
          return res.end('You cannot fork your own Hooks. Try creating a new Hook instead? https://hook.io/new');
        }

        // before we fork, check if hook already exists by that name, if return error
        hook.find({ owner: req.session.user, name: h.name }, function (err, result) {
          if (err) {
            return res.end(err.message);
          }
          if(result.length > 0) {
            return res.end("You've already forked this Hook at " + config.app.url + "/" + req.session.user + "/" + h.name);
          }
          forkScript(h);
        });
      }
      */
      function forkScript (h) {
        var _hook = {
          owner: req.session.user,
          name: h.name,
          source: h.source,
          language: h.language,
          mschema: h.mschema,
          themeSource: h.themeSource,
          presenterSource: h.presenterSource
        };
        return hook.create(_hook, function(err, result){
          if (err) {
            return callback(err.message);
          }
          var h = result;
          //console.log('performing redirect', req.session.user);
          return res.redirect('/admin?owner=' + _hook.owner + "&name=" + _hook.name + "&status=forked");
        });
      };

      function forkGithubScript () {
        // authenticate github API
        if (typeof req.user.accessToken === "undefined") {
          // redirect to github login with fork role ability
          return res.redirect(301, '/login/github/gist');
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
              owner: req.session.user,
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