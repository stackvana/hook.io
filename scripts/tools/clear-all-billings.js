var config = require('../../config');

var billing = require('../../lib/resources/billing');
var user = require('../../lib/resources/user');

var colors = require('colors');

billing.persist(config.couch);
user.persist(config.couch);

user.findOne({
  name: 'bobby'
}, function(err, _u){
  if(err) {
    throw err;
  }
  _u.servicePlan = "free";
  _u.save(function(err){
    if(err) {
      throw err;
    }
    clearBillings();
  })
});

function clearBillings () {
  billing.find({ owner: 'bobby' }, function(err, results){

  // billing.all(function(err, results){
    if(err) {
      throw err;
    }
    console.log(results)
    function destroy () {
      if (results.length === 0) {
        process.exit();
      }
      var result = results.pop();
      console.log(result.owner.toLowerCase())
      result.destroy(function(err, res){
        if (err) {
          throw err;
        }
        destroy();
      });
    }
    destroy();
  });
}