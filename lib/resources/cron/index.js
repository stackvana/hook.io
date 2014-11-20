var resource = require('resource');
var hook = require('../hook');
var cron = resource.define('cron');
var config = require('../../../config');
var request = require('hyperquest');
var parser = require('cron-parser');

hook.persist(config.couch);

cron.method('processAll', function(){

  // get all the hooks with active crons
  hook.find({ cronActive: true }, function(err, results){

    if (err) {
      throw err;
    }

    if(results.length === 0) {
      console.log("No cron jobs found!");
      process.exit();
    }

    // TODO: replace this forEach loop with a basic async iterator,
    // to ensure that crons are run in batches ( instead of all at once like they are now )

    results.forEach(function(h){
      if (typeof h.cron === "undefined" || h.cron.length < 8) {
        return;
      }
      //  h.cron = "*/1 * * * *";
      var now = new Date();
      h.lastCron = h.lastCron || now;
      var last = new Date(h.lastCron);
      var options = {
        currentDate: last
      };
      console.log('last', last)
      console.log('now', now)
      console.log(h.cron)
      try {
        var interval = parser.parseExpression(h.cron.toString(), options);
        var next = interval.next();
      } catch (err) {
        console.log('Error: ' + err.message);
      }
      h.lastCron = now;
      console.log('next', next)
      
      // if the next time the cron is suppose to run is before now ( minus a few ticks )
      if (next.getTime() < now.getTime() - 10) {
        var _url = 'http://hook.io/' + h.owner + "/" + h.name + "?ranFromCron=true";
        console.log("EXECUTE THE CRON", _url);
        var stream = request(_url)
        stream.on('error', function(err){
          console.log("UNCAUGHT ERROR MAKING REQUEST", err);
        });
        // pipe response to STDOUT ( for now )
        // TODO: do something meaningful with cron output
        stream.pipe(process.stdout)
      }
      h.save(function(err){
        if (err) {
          // TODO: do something meaningful with errors on save
          console.log("ERROR SAVING HOOK, THIS SHOULD NOT HAPPEN.", err)
        }
      })
    });
  });
});

module['exports'] = cron;