// used for running hot-code gateway services
// these are services which are never saved and are only run in real-time
// Note: a lot of this logic already exists in runHook.js and run.js files,
// we have replicated the logic here and created a new code path in the hopes of possible,
// refactoring / replacing runHook.js and run.js logic with this gateway.js
var config = require('../../../config');
var microcule = require('microcule');
var events = require('../events');
var metric = require("../metric");
var log = require("../log");
var user = require("../user");
var hook = require('./');
var psr = require('parse-service-request');
var resource = require('resource');

// use bash version 4 by spawned bash services by default
microcule.config.bash.version = 4;

module.exports = function gateway (req, res, next) {

  // gateway execution will automatically parse body everytime
  psr(req, res, function(req, res){

    var params = req.resource.params;

    var service = {
      owner: "anonymous",
      name: "gateway",
      language: params.language,
      code: params.code
    };

    if (typeof params.presenter !== "undefined" && params.presenter.length > 0) {
      service.presenter = params.presenter;
      service.view = "";
    }

    if (typeof params.schema === "string" && params.schema.length > 0) {
      // Remark: Should this parsing logic be inside stack library?
      try {
        params.schema = JSON.parse(params.schema)
      } catch (err) {
        res.end('invalid schema property. cannot parse as valid JSON');
      }
    }

    if (typeof params.schema === "object" && Object.keys(params.schema).length > 0) {
      service.schema = params.schema;
    }

    if (typeof params.view !== "undefined" && params.view.length > 0) {
      service.view = params.view;
    }

    if (typeof params.language === "undefined") {
      return res.end('language parameter is required!');
    }

    // legacy API
    params.code = params.source || params.code;

    if (typeof params.code === "undefined") {
      return res.end('code parameter is required!');
    }

    if (typeof req.headers === "object" && typeof req.headers["x-hookio-user-session-name"] === "string" && req.headers["x-hookio-user-session-name"].length > 0) {
      var _name = req.headers["x-hookio-user-session-name"];
      if (_name === "anonymous") {
        service.owner = "anonymous";
        return _spawn();
      }
      user.find({ name: _name }, function (err, _user){
        if (err) {
          return res.end(err.message);
        }
        if (_user.length === 0) {
          return res.end('Could not find user ' + _name + '. Please contact support.');
        }
        var u = _user[0];
        service.owner = _name;
        req.env = u.env || {};
        req.env.hookAccessKey = u.hookAccessKey;
        // TODO: refactor out key sorting into resource library
        var keys = Object.keys(req.env).sort();
        var __env = {};
        keys.forEach(function(k){
          __env[k] = req.env[k];
        });
        req.env = __env;
        return _spawn();
      })
    } else {
      service.owner = "anonymous";
      return _spawn();
    }

    function _spawn () {

    var customLogger = new log.Logger({
      ip: req.connection.remoteAddress,
      service: {
        owner: service.owner,
        name: service.name,
      }
    });

    service.log = customLogger.log.bind(customLogger); // Imporant: Must bind logger instance or it will lose `self` scope

      // only populate the service we are about to run with data specificed in params.data
      // this means that incoming parameters such as `code` and `language` will not be automically included in the spawned service
      // this seems like the least suprising way to handle parameters
      req.resource = {
        params: {}
      };

      for (var k in params.data) {
        req.resource.params[k] = params.data[k];
      }

      // Note: Rate limiting code has already been applied before reaching this code in worker
      // emit hook::run event, so we can scope gateway executions somewhere
      resource.emit('hook::run', {
        name: 'gateway',
        owner: service.owner,
        // ip: req.connection.remoteAddress,
        url: req.url
      });

      service.isHookio = true;
      if (config.useNSJAIL) {
        // TODO: move nsJAIL configuration to config file
        service.jail = "nsjail";
        service.jailArgs = config.nsJailArgs;
        service.home = "/";
      }

      // indicates that service should output stderr to stdout on non-zero exit codes
      // this is useful for users developing and debugging services
      // its the least surprising behavior for all use-cases
      // the only potential down-side is situations where you don't want to expose stderr data to the client
      // we could expose this option to the API and allow users to toggle it to hide errors to the client
      service.redirectStderrToStdout = true;

      // indicates that service should not close response when it exits
      // this is required for services that may be chains
      // for non-chained services, the final _res.end(); should end the response
      service.endResponseOnExit = false;

      microcule.plugins.mschema(service.schema)(req, res, function (err, re) {
        if (err) {
          return res.end(err.message);
        }
        // console.log("gateway".green, service.view)
        if (service.view) {
           microcule.viewPresenter({
            view: service.view,
            presenter: service.presenter
          }, req, res, function (err, req, output) {
            if (err) {
              return next(err);
            }
            microcule.plugins.spawn(service)(req, output, function(){
              if (err) {
                return res.end(err.message);
              }
              // if next() was fired, assume we need to end the request here
              output.end();
            });
          });
        } else {
          microcule.plugins.spawn(service)(req, res, function completed (err, r){
            // decrease currently running count by 1 ( required for tracking concurrency of running services )
            if (err) {
              return res.end(err.message);
            }
            // if next() was fired, assume we need to end the request
            res.end();
          });
        }
      });
    }

  });

};