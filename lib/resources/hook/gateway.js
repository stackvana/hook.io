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
      code: params.code,
      view: params.view,
      schema: params.schema,
      presenter: params.presenter
    };

    console.log('incoming to gateway'.yellow, params)

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

      // update metrics since hook is being run
      // service metrics need to be taken for rate-limit and concurrency amounts
      // metric.incr("/" + service.owner + "/running");
      metric.incr("/" + service.owner + "/" + "gateway" + '/hits');
      metric.incr("/" + service.owner + "/hits");
      metric.incr("/" + service.owner + "/totalHits");
      metric.incr("/" + service.owner + "/running");
      metric.incr("/hook/totalHits");

      // TODO: does the service have an owner? even anonymous needs concurrency limit

      spawn(service)(req, res, function completed (err, r){
        // decrease currently running count by 1 ( required for tracking concurrency of running services )
        metric.incrby("/" + service.owner + "/running", -1);
        console.log('service spawn complete'.blue, err, r);
        if (err) {
          return res.end(err.message);
        }
      });
    }

  });

};