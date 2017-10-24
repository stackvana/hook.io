// boots up all active crons from couch into redis ( useful for syncing state )

var hook = require('../lib/resources/hook');
var config = require('../config');
var cache = require('../lib/resources/cache');

hook.persist(config.couch);

cache.del('crons', function(err){
  if (err) {
    throw err;
  }
  hook.find({ cronActive: true }, function (err, results) {
    function insertCronIntoCache () {
      var hook = results.pop();
      var cron = {
        owner: hook.owner,
        name: hook.name,
        cron: hook.cron
      };
      cache.sadd('crons', cron, function (err, status) {
        if (err) {
          console.log(err);
        }
        if (results.length === 0) {
          process.exit();
          return;
        }
        insertCronIntoCache();
      });
    }
    insertCronIntoCache();
  });
});

