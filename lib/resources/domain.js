var resource = require('resource');
var domain = resource.define('domain');
var config = require('../../config');

domain.timestamps();

domain.property('name', {
  "type": "string",
  "default": "marak.com",
  "required": true,
  "minLength": 1,
  "maxLength": 50
});

domain.property('owner', {
  "type": "string",
  "required": true
});

module['exports'] = domain;