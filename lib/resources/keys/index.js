/*
  Basic Key store for public / private crypto-keys
  Currently used to manage developer access keys for public / private hooks
*/

var resource = require('resource');
var keys = resource.define('keys');
var config = require('../../../config');
var uuid = require('node-uuid');

var user = require('../user');

keys.timestamps();

keys.property('name', {
  "type": "string",
  "default": "my-key-name",
  "required": true,
  "minLength": 1,
  "maxLength": 50
});

keys.property('owner', {
  "type": "string",
  "default": "anonymous",
  "required": true,
  "minLength": 1,
  "maxLength": 50
});

keys.property('hook_public_key', {
  "type": "string",
  "default": "public-" + new Date().getTime()
});

keys.property('hook_private_key', {
  "type": "string"
});

keys.property('hook_private_key', {
  type: 'string',
  label: "Private Key",
  required: true,
  minLength: 1,
  maxLength: 255,
  size: 40,
  private: true
});

keys.property('key_type', {
  "type": "string",
  "enum": ["user", "service", "admin"],
  "default": "user"
});

keys.property('status', {
  "type": "string",
  "enum": ["active", "expired", "revoked"],
  "default": "active"
});

keys.property('roles', {
  "type": "string"
  // TODO: make actual array type instead of string
  // "type": "array"
});


// only allow 1 key for non-paid accounts
keys.before('create', function (data, next){

  var query = {
    owner: data.owner
  };

  if(typeof data.hook_private_key === "undefined") {
    data.hook_private_key = uuid();
  }

  // TODO: move to more generic paid account check
  user.find({ name: data.owner }, function (err, res){
    if (err) {
      return next(err, data);
    }
    var u = res[0];
    var status = u.paidStatus;

    if (u.paidStatus === "paid") {
      return next(null, data);
    }

    keys.find(query, function (err, res) {
      if (err) {
        return next(err, data);
      }
      if (res.length > 0) {
        var msg = 'You may not create more than one access key with a non-paid account. \n\nPlease see https://hook.io/pricing for more details.';
        return next(new Error(msg), data);
      }
      next(null, data);
    });
  })

});

module['exports'] = keys;