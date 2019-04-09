/*  

      resources/cron/process.js

      High level overview of how Crons are stored and processed:

      # Whenever a cron is created or saved, a new entry has been added to the sorted set "crons"  where key is the next calculated Unix Time the cron should run
      # Note: Only store the key and time of the cron, not any of the meta data ( as the meta-data is stored in a separate hash in the cache )
      ZADD crons NEXT_COMPUTED_DATE_TIME "/cron/marak/cron-test"

      # Next, a copy of the cron itself should be added to the cache
      SET /cron/marak/cron-test {data...}

      # Later, to get back all crons which should be executed. get a range by scores using range of -inf to current time
      # this should return all crons jobs which are expired ( ready to run )
      ( CURRENT_TIME is actually new Date().getTime() - 60000)
      ZREVRANGEBYSCORE crons CURRENT_TIME -inf

      # Now can mget the cached versions using the results ( keys array ) from the zscore query

      # After each cron is processed, delete that cron from the sorted set and then recaculate
      # at this point if the request is a success, we should delete entry
      ZREM crons /marak/cron-test

      # for most crons we'll want to estimate the next excution and add it back to the crons redis
      ZADD crons NEXT_COMPUTED_DATE_TIME "/cron/marak/cron-test"
*/

var async = require('async');
var request = require('hyperquest');
var metric = require('../metric');

module.exports = function processCron () {
  var cron = require('./cron');
  console.log('processing cron', new Date());
  cron.zrevrangebyscore('crons', new Date().getTime(), '-inf', function (err, results) {
    results = results.map(function (key){
      return '/cron' + key;
    });
    // for each batch, grab all crons from the cache
    if (!results || results.length === 0) {
      console.log('no results to process');
      process.exit();
    }
    cron.mget(results, function (err, crons) {
      // now iterate through all cached cron results with a fixed concurrency
      async.eachLimit(crons, 2, runCron, finish);
    });
  });

  function runCron (item, next) {
    try {
      item = JSON.parse(item);
    } catch (err) {
      return next(err);
    }
    var _request = {
      method: item.method.toLowerCase() || 'get',
      uri: item.uri,
      params: item.params || {}
    };
    var stream = request[_request.method](_request.uri, function (err, res) {
      if (err) {
        console.log('error running cron service', err.message);
      }
      // remove item sorted set
      cron.zrem('crons', '/' + item.owner + '/' + item.name, function (err, re) {
        // recalculate the next execution time and save it again
        var nextTime = cron.calculateNextExecution(new Date(), item.cronExpression);
        item.nextExecutionUnixTime = nextTime.getTime();
        item.nextExecutionDate = nextTime;
        metric.incr('/cron/' + item.owner + '/' + item.name, function(){
          cron.setCronCache(item, next);
        });
      });
    });
  }

  function finish (err, res) {
    console.log('completed cron', new Date(), err, res);
    process.exit();
  }
};