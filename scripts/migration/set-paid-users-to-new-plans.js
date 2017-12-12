var config = require('../../config');
var user = require('../../lib/resources/user');
var billing = require('../../lib/resources/billing');
var async = require('async');
var servicePlan = require('../../lib/resources/servicePlan')

var colors = require('colors');

user.persist(config.couch);
billing.persist(config.couch);

billing.all(function (err, results) {
  if (err) {
    throw err;
  }
  console.log(err, results.length);

  // for each registered billing, set the user document with new 'servicePlan' status
  async.each(results, function iter (b, cb) {
    user.findOne({ email: b.email }, function (err, u) {
      if (err) {
        // skip, could not find
        //console.log('could not find user to match billing: ', b.email)
        return cb();
      }
      var plan = 'free';
      // console.log(b.plan, b.email)
      Object.keys(servicePlan).forEach(function(k){
        if (servicePlan[k].stripe_label === b.plan) {
          plan = k;
        }
      });
      u.servicePlan = plan;
      u.save(function(){
        cb();
      });
    });
  }, function complete(){
    // process exit required to close redis connections from user resource ( cache / metrics )
    process.exit();
  });
});