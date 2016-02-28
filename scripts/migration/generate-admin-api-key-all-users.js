var config = require('../../config');

var user = require('../../lib/resources/user');
var role = require('../../lib/resources/role');

var keys = require('../../lib/resources/keys');

var colors = require('colors');

user.persist(config.couch);
keys.persist(config.couch);

user.all(function(err, results){
  if(err) {
    throw err;
  }
  function setName () {
    if (results.length === 0) {
      process.exit();
    }
    
    var result = results.pop();
    result.name = result.name.toLowerCase();
    //result.githubOauth = true;
    console.log(result.name.toLowerCase())
    keys.create({ name: 'admin-access-key', owner: result.name, roles: Object.keys(role.roles) }, function(err, key){
      if (err) {
        console.log(err.message, result.name)
        return setName();
      }
      console.log('created key', key)
      setName();
      
    })
  }
  setName();
});

console.log(role.roles);