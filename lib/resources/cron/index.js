var resource = require('resource');
var hook = require('../hook');
var cron = resource.define('cron');
var config = require('../../../config');
var request = require('hyperquest');
var parser = require('cron-parser');

hook.persist(config.couch);

cron.method('processAll', function(cb){

  // get all the hooks with active crons
  
  hook.find({ cronActive: true }, function(err, results){

    if (err) {
      throw err;
    }

    if(results.length === 0) {
      console.log("No cron jobs found!");
      return cb();
    }

    // TODO: replace this forEach loop with a basic async iterator,
    // to ensure that crons are run in batches ( instead of all at once like they are now )
    // see: https://github.com/bigcompany/hook.io/issues/55
    //
    // Remark: 2x the callbacks to account for having to save every cron
    // 1 callback for running the outgoing request, another 1 callback for hook.save()
    //
    var callbacks = (results.length - 1) * 2;

    results.forEach(function(h){
      if (typeof h.cron === "undefined" || h.cron.length < 8) {
        return;
      }
      // Remark: For testing you can hard-code the crons to run every-time
      // h.cron = "*/1 * * * * *";
      var now = new Date();
      h.lastCron = h.lastCron || now;
      var last = new Date(h.lastCron);
      var options = {
        currentDate: last
      };
      console.log(h.owner + '/' + h.name, h.cron)
      console.log('last', last)
      console.log('now', now)
      try {
        var interval = parser.parseExpression(h.cron.toString(), options);
        var next = interval.next();
      } catch (err) {
        console.log('Error: ' + err.message);
        return cb();
      }
      h.lastCron = now;

      // if the next time the cron is suppose to run is before now ( minus a few ticks )
      if (next.getTime() < now.getTime() - 10) {
        var _url = 'http://hook.io/' + h.owner + "/" + h.name + "?ranFromCron=true&run=true";
        console.log("EXECUTE THE CRON", _url);
        var stream = request(_url);
        stream.on('error', function(err){
          console.log("UNCAUGHT ERROR MAKING REQUEST", callbacks, err.message);
          callbacks--;
          if (callbacks === 0) {
            return cb();
          }
        });
        stream.on('end', function(){
          console.log('stream ended', callbacks);
          callbacks--;
          if (callbacks === 0) {
            return cb();
          }
        });
        // pipe response to STDOUT ( for now )
        // TODO: do something meaningful with cron output
        // possible issue here...it seems that if the stream is not piped somewhere,
        // it will not open...appears to be working on production and not on dev
        // best to continue to pipe stream to console for now...
        stream.pipe(process.stdout);
      }
      console.log("_______");
      h.save(function(err){
        if (err) {
          // TODO: do something meaningful with errors on save
          console.log("ERROR SAVING HOOK, THIS SHOULD NOT HAPPEN.", err)
        }
        callbacks--;
        if (callbacks === 0) {
          return cb();
        }
      });
    });
  });
});

module['exports'] = cron;