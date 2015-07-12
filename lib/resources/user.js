// default user functionality
var user = require('resource-user');
var metric = require('./metric');

// stores ENV variables for Hooks, these values will map to Hook.env on Hook execution
user.property('env', 'object');

// stores user which referred this user to sign up
user.property('referredBy', 'string');

// user.property('dedicatedSignup', 'object');

user.property('stripeID', 'string');

user.property('domains', ["string"]);

user.property('emailBlasts', ["string"]);

// updates metrics for total hook count after creating
user.after('create', function(data, next){
  metric.incr('/user/count');
  next(null, data);
});

// ctime and mtime time stamps
user.timestamps();

module['exports'] = user;