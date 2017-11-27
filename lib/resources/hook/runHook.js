var request = require('hyperquest');
var log = require("../log");
var user = require("../user");
var cache = require("../cache");
var metric = require("../metric");
var events = require('../events');
var formatError = require("./formatError");
var themes = require('../themes');
var config = require('../../../config');
var checkRoleAccess = require('../../server/routeHandlers/checkRoleAccess');
var stack = require('microcule');
// use bash version 4 by spawned bash services by default
stack.config.bash.version = 4;
var resource = require('resource');
module['exports'] = function runHook (opts, callback) {
  // console.log('running the hook'.yellow, req.params.owner, req.params.hook)
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
  untrustedService.gist = h.gist;
  untrustedService.schema = {};
  untrustedService.hookType = h.hookType || "service";
  untrustedService.customTimeout = h.customTimeout || config.UNTRUSTED_HOOK_TIMEOUT;
  // TODO: clean up execution chain, normalize error handlers,
  // put entire sequence into async iterator
  /*
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
  */

  function validateAndRunHook (opts, cb) {

    if (req.hook.mschemaStatus === "disabled") {
      delete req.hook.mschema;
    }

    // TOOD: remove manual mschema call here, should use input plugin instead
    // TODO: only perform validation if schema exists
    stack.plugins.mschema(req.hook.mschema)(req, res, function (err) {
      //console.log('post validateServiceInput', err);
      if (err) {
        // changes format of validation errors as of 8/25/16
        // return opts.res.end(hook.formatError(err).message)
        return cb(err);
      }

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

      function _runHook () {

        resource.emit('hook::run', {
          name: req.hook.name,
          owner: req.hook.owner,
          // ip: req.connection.remoteAddress,
          url: req.url
        });

        function _errorHandler (err) {
          err = formatError(err);
          return res.end(err.message);
        }

        var customLogger = new log.Logger({
          ip: req.connection.remoteAddress,
          service: {
            owner: untrustedService.owner,
            name: untrustedService.name,
          }
        });

        var debug = customLogger.log.bind(customLogger); // Imporant: Must bind logger instance or it will lose `self` scope

        // TODO: this block should probably be removed / and or reviewed
        // appears to be theme and view-presenter related code
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

        // spawn hook service as child process in chroot jail
        function _spawn () {

          req.env.hookAccessKey = req._user.hookAccessKey;
          return _finishSpawn();

          function _finishSpawn () {
            // console.log("CALLED _finishSpawn")

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
            untrustedService.log = debug;

            if (untrustedService.themeStatus !== "disabled" && untrustedService.view) {
              stack.viewPresenter(untrustedService, req, res, function (err, req, output){
                if (err) {
                  return callback(err);
                }
                _spawnService(req, output);
              })
            } else {
              _spawnService (req, res);
            }

            function _spawnService (_req, _res) {
              if (config.useNSJAIL) {
                untrustedService.jail = "nsjail";
                untrustedService.jailArgs = config.nsJailArgs;
                untrustedService.home = "/";
              }
              console.log(new Date(), 'spawning', req.method, req.url);
              // untrustedService.home = __dirname + "/../../../";

              // indicates that service should output stderr to stdout on non-zero exit codes
              // this is useful for users developing and debugging services
              // its the least surprising behavior for all use-cases
              // the only potential down-side is situations where you don't want to expose stderr data to the client
              // we could expose this option to the API and allow users to toggle it to hide errors to the client
              untrustedService.redirectStderrToStdout = true;
              stack.plugins.spawn(untrustedService)(_req, _res, function _serviceEnded (err, result) {
                // console.log('service has ended'.red, req.params.owner, req.params.hook, err, result);
                //
                // This is the callback for when the service has actually completed ( output has ended / next has been called from stack.spawn )
                //
                // console.log('inputs:levels', req.hook.inputs, req.level)
                if (typeof req.level !== 'undefined') { // req.hook.inputs
                  // if the callback made it this far and levels have been defined, it's possible we have additional middlewares to process,
                  // do not end response here
                  callback();
                } else {
                  _res.end();
                }
              });
            }
          }
        }
      }
    });
  }

  function _execute2 () {

    hook.preprocessHook(opts, untrustedService, function (err, untrustedService) {
      // console.log("_execute2 untrustedService", untrustedService)
      if (err) {
        // opts.res.writeHead(500);
        return opts.res.end(hook.formatError(err).message)
      }
      untrustedService.language = req.hook.language || "javascript";

      untrustedService.view = req.hook.themeSource;
      untrustedService.themeStatus = req.hook.themeStatus;
      untrustedService.presenter = req.hook.presenterSource || req.hook.presenter || "";

      // check if source of gist is remote, if so use the corresponding remote source code middleware
      if (req.hook.sourceType === "gist" && typeof untrustedService.gist === "string" && untrustedService.gist.length > 0) {
        var gistID = untrustedService.gist.split('/');
        gistID = gistID[gistID.length - 1];
        if (typeof req._user.githubAccessToken === "undefined") {
          // TODO: move to config.messages
          // TODO: fallback to config. marak access token so previous services dont fail
          // fallback to legacy gist api
          return fetchRemoteGistSource({
            req: req,
            res: res,
            gist: untrustedService.gist
          }, function (err, code) {
            if (err) {
              // opts.res.writeHead(500);
              return opts.res.end(hook.formatError(err).message)
            }
            req.code = code;
            untrustedService.source = req.code || h.source;
            untrustedService.code = req.code || h.source;
            validateAndRunHook(opts, callback);
          });
          // return callback(new Error('Could not load Github oauth token!\n\nAs of 12/24/2017, a valid Github OAuth token is now required for all Github code sources.\nTo fix this, simply visit https://hook.io/login/github in your browser to generate a valid Github OAuth access token.'));
        }
        stack.plugins.sourceGithubGist({
          gistID: gistID,
          main: req.hook.mainEntry,
          token: req._user.githubAccessToken
        })(req, res, function (){
          if (err) {
            return next(err)
          }
          untrustedService.source = req.code || h.source;
          untrustedService.code = req.code || h.source;
          validateAndRunHook(opts, callback);
        });
      }
      else if (req.hook.sourceType === "githubRepo" && typeof req.hook.githubRepo === "string" && req.hook.githubRepo.length > 0) {
        if (typeof req._user.githubAccessToken === "undefined") {
          // TODO: move to config.messages
          // TODO: fallback to config. marak access token so previous services dont fail
          if (config.env === 'prod') {
            return callback(new Error('Could not load Github oauth token!\n\nAs of 12/24/2016, a valid Github OAuth token is now required for all Github code sources.\nTo fix this, simply visit https://hook.io/login/github in your browser to generate a valid Github OAuth access token.'));
          } else {
            // This is needed for tests
            req._user.githubAccessToken = config.github.accessToken;
          }
        }
        stack.plugins.sourceGithubRepo({
          repo: req.hook.githubRepo,
          branch: req.hook.githubBranch,
          main: req.hook.mainEntry,
          token: req._user.githubAccessToken,
          errorHandler: function (err, next) {
            var newErr;
            if (err.message === "Bad credentials") {
              newErr = new Error('Invalid Github oauth key: ' + token + '\nThis is most likely a hook.io problem. Please contact support.');
            }
            if (err.message === "Not Found") {
              newErr = new Error('Could not load: ' + req.hook.githubRepo + "@" + req.hook.githubBranch + ":" + req.hook.mainEntry + '\nIs this information correct?\nIf ' + req.hook.githubRepo + ' is a private repo, please make sure to login at ' + config.app.url + '/login/github/private-repos in order to grant hook.io access');
            }
            return next(newErr);
          }
        })(req, res, function (err) {
          if (err) {
            return callback(err);
          }
          untrustedService.source = req.code || h.source;
          untrustedService.code = req.code || h.source;
          validateAndRunHook(opts, callback);
        });
      } else {
        untrustedService.source = req.code || h.source;
        untrustedService.code = req.code || h.source;
        validateAndRunHook(opts, callback);
      }
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
    // legacy _execute() method removed 10/13/16 in favor of stackvana plugins
    // _execute();
    _execute2();
    }
  });

}

function fetchRemoteGistSource (opts, cb) {

  var gist = opts.gist; // || "https://gist.github.com/Marak/357645b8a17daeb17458";
  var userScript =  gist.replace('https://gist.github.com/', '');
  userScript = userScript.replace('/', ' ');
  var parts  = userScript.split(" ");
  var username = parts[0],
      script = parts[1];

  var req = opts.req, res = opts.res;
  var gistAPI = "https://api.github.com/gists/" + script;

  // Indicate that a change has happened to the hook and it should be saved
  // req.saveHook = true;
  /*
    fetches the latest version of source code from remote Github Gist Source
    requires a valid and correctly formatted link to a github gist URL
  */
  var options = {
    headers: {
      "User-Agent": "hook.io source code agent"
    }
  };
  // must validate request. github API limits requests per hour. non-authorizated HTTP requests cap out quickly.
  // warning: in the future, we might have to ask github to increase our API limit / create several access tokens
  if (config.github.accessName && config.github.accessName.length && config.github.accessToken && config.github.accessToken.length) {
    options.headers['Authorization'] = "Basic " + new Buffer(config.github.accessName + ":" + config.github.accessToken, "utf8").toString("base64")
  }
  // console.log('getting gistAPI', gistAPI)
  request.get(gistAPI, options, function (err, apiRes) {
    if (err) {
      return res.end(err.message);
    }
    var apiReply = '';
    apiRes.on('data', function (c) {
      apiReply += c.toString();
    });
    apiRes.on('error', function(err){
      return callback(err);
    });
    apiRes.on('end', function(){
      var gistJSON = {}, files, keys;
      try {
        gistJSON = JSON.parse(apiReply.toString());
        files = gistJSON.files;
        keys = Object.keys(files);
      } catch (err) {
        return cb(new Error('Not valid JSON: ' + apiReply));
      }
      // assume first file is the source code
      requestSource(gistJSON.files[keys[0]].raw_url);
    });
    function requestSource (source) {
      // console.log('getting new hook source', source)
      request.get(source, function (err, res) {
        if (err) {
          return opts.res.end(err.message);
        }
        var body = '';
        res.on('data', function(c){
          body += c.toString();
        });
        res.on('end', function(){
          var code = body.toString();
          req.hook.source = code;
          // console.log('fetchHookSourceCode setting hook.source', code);
          cb(null, code);
        });
      });
    }
  });
}