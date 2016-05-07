var psr = require('parse-service-request');
var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var config = require('../../config');
var mschema = require('mschema');
var keys = require('../../lib/resources/keys');

module['exports'] = function destroyKeysPresenter (opts, callback) {

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
      checkRoleAccess({ req: req, res: res, role: "keys::destroy" }, function (err, hasPermission) {
        if (!hasPermission) {
          return res.end(config.messages.unauthorizedRoleAccess(req, "keys::destroy"));
        } else {
          var validate = mschema.validate(req.resource.params, self.schema);
          if (!validate.valid) {
            validate.status = "error";
            return res.json(validate);
          } else {
            
            return keys.findOne({ name: params.name }, function (err, k) {
              if (err) {
                return res.end(err.message)
              }
              k.destroy(function(err){
                if (err) {
                  return res.end(err.message)
                }
                return res.json({ status: 'deleted' });
              });
            })
            
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
  }
};