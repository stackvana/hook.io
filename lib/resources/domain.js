var http = require('resource-http');

var domain = http.domain;

// Foreign Key to user.name
domain.property('owner', {
  "type": "string",
  "required": true
});

module['exports'] = domain;