/*
  Basic Key store for public / private crpto-keys
  Currently used to manage developer access keys for public / private hooks
*/

var resource = require('resource');
var keys = resource.define('keys');
var config = require('../../../config');

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
  "type": ["string"]
});

module['exports'] = keys;