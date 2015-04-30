// default user functionality
var user = require('resource-user');

// stores ENV variables for Hooks, these values will map to Hook.env on Hook execution
user.property('env', 'object');

// stores user which referred this user to sign up
user.property('referredBy', 'string');

// user.property('dedicatedSignup', 'object');

user.property('stripeID', 'string');

// ctime and mtime time stamps
user.timestamps();

module['exports'] = user;