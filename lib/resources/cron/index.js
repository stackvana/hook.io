var resource = require('resource');
var colors = require('colors');
var hook = require('../hook');
var cron = resource.define('cron');
var config = require('../../../config');
var metric = require('../metric');
var request = require('hyperquest');
var parser = require('cron-parser');
var async = require('async');

hook.persist(config.couch);

var i = 0;

cron.method('processAll', function(callback){
  // get all the hooks with active crons
  
  hook.find({ cronActive: true }, function(err, results){

    if (err) {
      throw err;
    }

    if(results.length === 0) {
      console.log("No cron jobs found!");
      return callback();
    }

    function runCron (h, cb) {
      if (typeof h.cron === "undefined" || h.cron.length < 8) {
        return cb();
      }
      // Remark: For testing you can hard-code the crons to run every-time
      // h.cron = "*/1 * * * * *";
      var now = new Date();

      // TODO: get lastCron metric from redis
      var lastCron;
      metric.get('/' + h.owner + '/' + h.name + '/lastCron', function (err, m){
        if (err) {
          // should not error
          console.log('should not error');
          throw err;
        }
        if (m === null) {
          lastCron = now;
          metric.set('/' + h.owner + '/' + h.name + '/lastCron', lastCron, function(){
            parseCron();
          });
        } else {
          lastCron = m;
          parseCron();
        }
      });

      function parseCron () {

        var last = new Date(lastCron);
        var options = {
          currentDate: last
        };
        console.log(h.owner + '/' + h.name, h.cron)
        console.log('last', last)
        console.log('now', now)
        console.log(h.cron.toString());
        var error = false;
        try {
          var interval = parser.parseExpression(h.cron.toString(), options);
          var next = interval.next();
        } catch (err) {
          console.log('Error: ' + err.message);
          error = true;
          // ignore errors, keep going
          // TODO: mark hook as inactive / disabled due to error?
        }
        if (error) {
          return cb();
        }
        // if the next time the cron is suppose to run is before now ( minus a few ticks )
        if (next.getTime() < now.getTime() - 10) {
          var _url = 'https://hook.io/' + h.owner + "/" + h.name + "?ranFromCron=true&run=true";
          console.log("running the hook", _url);
          var stream = request.get(_url, function(err, res) {
            if (err) {
              console.log('error running hook', err.message);
            }
            // let's not do anything with the result for now
            cb();
          });

          // update metrics
          // TODO: bad reference?
          metric.incr("/" + h.owner + "/" + h.name + '/ranFromCron');
          metric.set("/" + h.owner + "/" + h.name + '/lastCron', now);

          // pipe response to STDOUT ( for now )
          // TODO: do something meaningful with cron output
          // possible issue here...it seems that if the stream is not piped somewhere,
          // it will not open...appears to be working on production and not on dev
          // best to continue to pipe stream to console for now...
        } else {
          console.log('Not time to run cron yet...');
          return cb();
        }
      }
    };
    function finish (err, res) {
      console.log('finished'.red, err, res)
      return callback(err);
    };

    async.eachLimit(results, 5, runCron, finish);
  });
});

module['exports'] = cron;