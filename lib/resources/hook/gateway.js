// used for running hot-code gateway services
// these are services which are never saved and are only run in real-time
// Note: a lot of this logic already exists in runHook.js and run.js files,
// we have replicated the logic here and created a new code path in the hopes of possible,
// refactoring / replacing runHook.js and run.js logic with this gateway.js

var spawn = require('stackvana').spawn;
var events = require('../events');
var metric = require("../metric");
var user = require("../user");
var hook = require('./');
var psr = require('parse-service-request');

module.exports = function gateway (req, res) {

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
      req.resource = {
        params: params.data
      };
      // emit hook::run event, so we can scope gateway executions somewhere
      events.emit('hook::run', {
        name: 'gateway',
        owner: service.owner,
        ip: req.connection.remoteAddress,
        url: req.url
      });

      spawn(service)(req, res, function completed (err, r){
        // decrease currently running count by 1 ( required for tracking concurrency of running services )
        if (err) {
          return res.end(err.message);
        }
      });

    }

  });

};