var config = require('../../config');

var user = require('../../lib/resources/user');

var colors = require('colors');


user.persist(config.couch);

user.all(function(err, results){
  if(err) {
    throw err;
  }
  console.log(results)
  function setName () {
    if (results.length === 0) {
      process.exit();
    }
    var result = results.pop();
    result.name = result.name.toLowerCase();
    result.githubOauth = true;
    console.log(result.name.toLowerCase())
    result.save(function(err, res){
      console.log(err)
      if (err) {
        throw err;
      }
      setName();
    });
    
  }
  setName();
});