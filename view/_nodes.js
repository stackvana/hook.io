var cache = require('../lib/resources/cache');
var config = require('../config');
var psr = require('parse-service-request');
var df = require('dateformat');

module['exports'] = function _nodesPresenter (opts, callback) {
  var $ = this.$, req = opts.req, res = opts.res;

  // TODO: add roles and groups
  if (typeof req.session.user === "undefined" || req.session.user.toLowerCase() !== "marak") {
    return res.redirect('/login');
  }

  psr(req, res, function(){

    var params = req.resource.params;
    if (params.remove) {
      cache.srem('pools.' + params.remove.pool, params.remove.node, function(err, result){
        // console.log("srem failure", err, result)
        if (err) {
          res.statusCode = 500;
          return res.end(err.message);
        }
        getLatest();
      })
    } else {
      getLatest();
    }

    function getLatest () {

      cache.smembers('pools.web', function (err, webs) {
        if (err) {
          return cb(err);
        }
        // console.log('got pools.web', webs);
        if (webs !== null && typeof webs === "object") {
          config.pools.web = webs;
        }
        cache.smembers('pools.worker', function (err, workers) {
          if (err) {
            return cb(err);
          }
          // console.log('got pools.worker', workers);

          // sort by host and port
          workers.sort(function(a, b){
            return a.port > b.port;
          });

          webs.sort(function(a, b){
            return a.port > b.port;
          });

          workers.forEach(function(w){
            w.pool = "worker";
            $('.table').append('<tr><td>' + 'worker'+ '</td><td>' + w.host + '</td><td>' + w.port + '</td><td>' + df(w.spawned) + '</td><td>' + w.status + '</td><td><button data-node=\'' + (JSON.stringify(w)) + '\'">Remove</button></td></tr>')
          });

          webs.forEach(function(w){
            w.pool = "web";
            $('.table').append('<tr><td>' + 'web'+ '</td><td>' + w.host + '</td><td>' + w.port + '</td><td>' + df(w.spawned) + '</td><td>' + w.status + '</td><td><button data-node=\'' + (JSON.stringify(w)) + '\'">Remove</button></td></tr>')
          });

          callback(null, $.html());
        });
      });
    }

  });
  
};