var http = require('resource-http');

var domain = http.domain;

var config = require('../../config');
var checkRoleAccess = require('../server/routeHandlers/checkRoleAccess');



// Foreign Key to user.name
domain.property('owner', {
  "type": "string",
  "required": true
});

domain.before('all', function(data, next){
  next(null, data);
});

domain.before('find', function(data, next){
  // check auth role
  var self = this;
  checkRoleAccess({ req: self.req, res: self.res, role: "domain::find" }, function (err, hasPermission) {
    if (!hasPermission) {
      next(new Error(config.messages.unauthorizedRoleAccess(self.req, "domain::find")), data);
      //return res.end(config.messages.unauthorizedRoleAccess(req));
    } else {
      next(null, data);
    }
  });
});

domain.before('create', function(data, next){
  // TODO: perform role check
  // Note: view already has role check in-place to make API secure, we'd remove that in favor for this
  // console.log(this, data)
  next(null, data);
});

module['exports'] = domain;