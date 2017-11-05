var mergeParams = require('merge-params');
var cache = require('../cache');
var metric = require('../metric');
var config = require('../../../config');
var async = require('async');

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
  res.status(404);
  return res.end('404 not found /' + req.params.owner + '/' + req.params.hook);
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
          // no need to reduce concurrency here? as it hasn't incremented?
          // metric.zincrby(['running', -1, req.params.owner]);
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
      // console.log('way before running hook', req.hook)
      // req.processedInputs = true;
      // console.log('found the following hook'.blue, req.hook);
      var inputs = req.hook.inputs || [];
      // console.log('found inputs'.red, inputs, req.level)

      //  Determine if this a chained service, if so, we need to execute the chain of services using async
      if (inputs.length > 0 && !req.processedInputs) {
        // For every chained service, we need to re-call hook.run and execute these services as a middleware chain

        // re-run hook with modified req/res url? is that okay?
        var key = req.params.owner + "/" + req.params.hook;
        var ogOwner = req.params.owner, ogHook = req.params.hook;

        if (typeof req.level === 'undefined') {
          // Keeps track of the levels of service execution in the chain
          // Each level can be considered the straight chain of services
          // If the services which are chained call additional chains, that will count as an additional level ( and so on )
          req.level = 0;
          req.levels = [key];
        } else {
          // Since inputs were detected on this hook, increase the level of the chain
          req.level ++;
          req.levels.push(req.params.owner + '/' + req.params.hook)
        }

        // Note: Default max levels is 20. This should cover most cases ( for now )
        // In theory, we shouldn't ever this code path due to ciricular references ( since they should be validated before being saved )
        if (req.level > 20) {
          res.write("We've stopped execution since the chain is now 20 levels deep.\n");
          res.write("This usually indicates an uncaught circular reference, which our systems are suppose to catch before executions.\n");
          res.end("If this is an error or you require a longer chain, please contact support.\n");
          return;
        }

        // For each input in the inputs array, run the service in a serial async chain
        // If any errors occur during the execution of the chain, the response will end that that error message
        async.eachSeries(inputs, function iterate(item, cb){
          var input = item.split('/');
          if (input.length < 2) {
            return res.end('invalid service name ' + input.toString())
          }
          req.params.owner = input[0].toLowerCase();
          req.params.hook = input[1].toLowerCase();
          // console.log('LEVELS'.yellow, req.levels, input)

          // Do not allow services to reference themself ( circular reference ),
          // this would cause the request to never end, which is not good
          if (req.levels.indexOf(req.params.owner + '/' + req.params.hook) !== -1) {
            res.write('Cannot chain service to itself: ' + req.params.owner + '/' + req.params.hook + '\n')
            return res.end('Circular chain detected...aborting');
          }

          // console.log('found input'.blue, input, req.params)
          run(req, res, function(err){
            // console.log('service completed'.magenta, req.params.owner, req.params.hook)
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
            // console.log('ended current chain'.blue, req.url, cb.toString())
            cb();
          });
        }, function completed (err) {
          req.params.owner = ogOwner;
          req.params.hook = ogHook;
          // TODO: allow for multi-level chains, right now we can only chain once ( at the top level )
          // Any attempts to include sub-chains will not be executed
          req.processedInputs = true;
          // console.log('made it to final hook'.blue, ogOwner, ogHook)
          run(req, res, function (err, response) {
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
            // console.log('service completed'.magenta, response)
            // Continue to next() middleware ( if the none of the services have called end )
            return next();
            // return res.end();
            /*
            // Can this block now be removed?
            if (typeof req.level !== 'undefined') { // req.hook.inputs
              // if the callback made it this far and levels have been defined, it's possible we have additional middlewares to process,
              // do not end response here
              // Continue to next() middleware ( if the none of the services have called end )
              next();
            } else {
            }
            */

          });
        });
      } else {
        hook.runHook({ req: req, res: res }, function (err, response) {
          if (err) {
            // There is some irregulairty to how errors are being handled
            // Inside the execution chain for running hooks, sometimes errors may be sent directly
            // to res.end(err.message) instead of being propigated down the chain to this callback
            // It would be better to have all errors be passed forward and handled here instead of letting
            // the chain directly calling res.end()
            // see: https://github.com/bigcompany/hook.io/issues/53
            console.log('hook had an issue running ' + err.message);
            if (req.jsonResponse) {
              var r = {
                error: true,
                message: err.message
              };
              return res.json(r);
            } else {
              return res.end(err.message);
            }
          }
          // console.log('service completed'.green, response)
          // Continue to next() middleware ( if the none of the services have called end )
          next();
        });
      }

      // TODO: check and run for outputs
      function _outputs () {

      }

    };

  });
};