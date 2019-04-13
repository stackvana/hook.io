var psr = require('parse-service-request');
var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var config = require('../../config');
var mschema = require('mschema');
var keys = require('../../lib/resources/keys');

module['exports'] = function createKeysPresenter (opts, callback) {

  var $ = this.$, 
      req = opts.request,
      res = opts.response,
      params = req.resource.params;

  var self = this;

  psr(req, res, function(req, res, fields){
    for (var p in fields) {
      params[p] = fields[p];
    }
    finish();
  });

  function finish () {
    if (typeof params.hook_private_key !== 'undefined') {
      // TODO: move to resource.before hooks
      checkRoleAccess({ req: req, res: res, role: "keys::create" }, function (err, hasPermission) {
        if (!hasPermission) {
          return res.end(config.messages.unauthorizedRoleAccess(req, "keys::create"));
        } else {
          var validate = mschema.validate(req.resource.params, self.schema);
          if (!validate.valid) {
            validate.status = "error";
            res.status(400);
            return res.json(validate);
          } else {
            req.resource.params.owner = req.resource.owner;
            // do not allow user to set a custom private key
            delete req.resource.params.hook_private_key;
            return keys.create(req.resource.params, function (err, result) {
              if (err) {
                res.status(400);
                return res.json({ error: true, message: err.message });
              }
              return res.json(result);
            });
          }
        }
      });
    } else {
      return res.json({ hasAccess: false });
    }
  }

};

module['exports'].schema = {
  name: {
    type: 'string',
    required: true
  },
  hook_private_key: {
    type: 'string',
    required: true
  },
  roles: {
    type: 'string',
    required: true
  }
};