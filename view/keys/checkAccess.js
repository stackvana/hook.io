var psr = require('parse-service-request');
var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var config = require('../../config');
var user = require('../../lib/resources/user');

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
      checkRoleAccess({ req: req, res: res, role: params.role, include_doc: true }, function (err, result, _key) {
        if (err) {
          return res.end(err.message);
        }
        if (result === false) {
          return res.json({ hasAccess: false });
        }
        user.findOne({ name: _key.owner }, function (err, _user) {
          if (err) {
            return res.end(err.message);
          }
          var rsp = {};
          rsp.key = _key;
          rsp.user = {
              name: _user.name,
              email: _user.email,
          };
          rsp.hasAccess = true;
          return res.json(rsp);
        });
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