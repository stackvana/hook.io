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

user.property('hostingCredits', 'number');

user.property('emailBlasts', ["string"]);

user.property('githubOauth', "boolean");

// updates metrics for total hook count after creating
user.after('create', function(data, next){
  metric.incr('/user/count');
  next(null, data);
});

user.before('create', function (_user, next) {
  if(typeof _user.name === "string") {
    _user.name = _user.name.toLowerCase();
  }
  next(null, _user);
});

user.before('update', function (_user, next) {
  if(typeof _user.name === "string") {
    _user.name = _user.name.toLowerCase();
  }
  next(null, _user);
});

// ctime and mtime time stamps
user.timestamps();

module['exports'] = user;