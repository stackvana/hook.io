var psr = require('parse-service-request');
var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var config = require('../../config');

module['exports'] = function keysCheckAccessPresenter (opts, callback) {

  var $ = this.$, 
      req = opts.request,
      res = opts.response,
      params = req.resource.params;

  psr(req, res, function(req, res, fields){
    for (var p in fields) {
      params[p] = fields[p];
    }
    finish();
  });

  function finish () {
    
    // TODO: only allow for accounts with enabled featured 'customRoleChecks'
    if (typeof params.hook_private_key !== 'undefined') {
      // TODO: move to resource.before hooks
      checkRoleAccess({ req: req, res: res, role: params.role }, function (err, hasPermission) {
        if (!hasPermission) {
          return res.json({ hasAccess: false });
        } else {
          return res.json({ hasAccess: true });
        }
      });
    } else {
      return res.json({ hasAccess: false });
    }
  }

};

module['exports'].schema = {
  "hook_private_key": {
    "type": "string",
    "required": true
  },
  "role": {
    "type": "string",
    "required": true
  }
};