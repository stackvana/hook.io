var config = require('../../config');

var hook = require('../../lib/resources/hook');

var colors = require('colors');


hook.persist(config.couch);

hook.all(function(err, results){
  if(err) {
    throw err;
  }
  console.log(results)
  function setName () {
    if (results.length === 0) {
      process.exit();
    }
    var result = results.pop();
    result.owner = result.owner.toLowerCase();
    result.name = result.name.toLowerCase();
    console.log(result.owner.toLowerCase())
    result.save(function(err, res){
      if (err) {
        throw err;
      }
      setName();
    });
    
  }
  setName();
});