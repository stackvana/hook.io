var metric = require('../../lib/resources/metric'),
    hook = require('../../lib/resources/hook'),
    user = require('../../lib/resources/user'),
    config = require('../../config');

var colors = require('colors');
hook.persist(config.couch);
user.persist(config.couch);

/*
metric.keys("/metric/*", function(err, results){
  console.log(err, results);
});

return;

client.flushall();
client.keys("*", function(err, res){
  console.log(err, res);
});

*/

metric.client.flushall(function(){
  user.all(function(err, users){
    hook.all(function(err, hooks){
      hooks.forEach(function(h){
        var key = "/" + h.owner + "/" + h.name + "/hits";
        console.log( h.ran);
        metric.incrby(key, h.ran);
        //metric.incrby('/hook/totalHits', h.ran)
      });
      metric.set('/hook/count', hooks.length);
    });
    metric.set('/user/count', users.length);
  });
});
