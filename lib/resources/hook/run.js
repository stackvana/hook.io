var mergeParams = require('../../../view/mergeParams');
var cache = require('../cache');
var metric = require('../metric');
var config = require('../../../config');
/*
var view = require('view');
var _view;
 view.create({ path: __dirname + "/../../../view"}, function (err, v){
   if (err) {
     throw err;
   }
   _view = v;
});
*/

function handle404 (req, res) {
  return res.end('404 not found');
  // TODO: actually use 404 handler scoped to app.view ( missing from this file )
  app.view['404'].present({
    req: req,
    res: res
  }, function (err, html){
    res.writeHead(404);
    res.end(html);
  })
};

var themes = require('../themes');

module['exports'] = function run (req, res, next) {

  var hook = require('./');

  mergeParams(req, res, function(){

    // check to see if user has hit rate limit for account
    // console.log('running hook'.yellow, req.url)
    // TODO: since cache is here, its tricky for auth, move auth...trying elsewhere
    var key = '/hook/' + req.params.owner + "/" + req.params.hook;

    if (typeof req.resource.params._rev === "string") {
      return findHook(function(err, h){
        if (err) {
          return res.end(err.message);
        }
        var nanoConfig = 'http://' + config.couch.username + ":" + config.couch.password + "@" + config.couch.host + ":" + config.couch.port;
        var nano = require('nano')(nanoConfig);
        // Note: possible issue with running from cache?
        // console.log('looking up rev', h[0].id, req.resource.params._rev)
        nano.request({
          db: 'hook',
          doc: h[0].id,
          method: 'get',
          qs: { rev: req.resource.params._rev }
        }, function (err, rev) {
          if (err) {
            return res.end(err.message);
          }
          return finish(err, rev);
        });
      });
    }

    // TODO: if params.invalidate has been sent, attempt to remove item from cache if it exists
    // if (typeof req.params.invalidate !== 'undefined') {}
    cache.get(key, function(err, _hook){
      if (_hook === null) {
        findHook(function(err, h){
          cache.set(key, h[0], function(){
            finish(err, h[0])
          });
        });
      } else {
        finish(null, _hook);
      }
    })

    function findHook (cb) {
      // find hook based on owner and id
      var query = { owner: req.params.owner, name: req.params.hook };
      hook.find.call({"req": req }, query, function (err, result) {
        if (err) {
          return res.end('Error communicating with couchdb: \n\n' + err.message);
        }

        if (result.length === 0) {
          // could not find hook, reduce concurrency
          metric.incrby("/" + req.params.owner + "/running", -1);
          return handle404(req, res);
        }
        cb(null, result);
      });
    };

    function finish (err, result) {

      // attach found hook onto request scope
      // console.log('attaching hook'.yellow, result)
      req.hook = result;

      // override theme if set in url
      var params = req.resource.params;
      if (typeof params.theme !== 'undefined') {

        if (typeof themes[params.theme] === 'undefined') {
          return res.end('Aborting Request! We we unable to find any themes on file called: ' + params.theme);
        }

        req._themeOverride = true;
        req._theme = themes[params.theme].theme;
        req._presenter = themes[params.theme].presenter;
      } else {
        req._themeOverride = false;
      }
      // Removed as legacy 4/23/16
      // req.params.gist = result.gist;
      // req.resource.params.gist = result.gist;

      // console.log('determineRequestFormat')
      hook.determineRequestFormat(req , res, function (req, response) {
        // console.log('runHook')
        hook.runHook({ req: req, res: res }, function (err, response) {
          // do nothing
          // console.log('ran the hook');
          if (err) {
            // There is some irregulairty to how errors are being handled
            // Inside the execution chain for running hooks, sometimes errors may be sent directly
            // to res.end(err.message) instead of being propigated down the chain to this callback
            // It would be better to have all errors be passed forward and handled here instead of letting
            // the chain directly calling res.end()
            // see: https://github.com/bigcompany/hook.io/issues/53
            console.log('hook had an issue running ' + err.message);
            return res.end(err.message);
          }
          // console.log('service completed', response)
        });
      });
    };

  });
};