var mschema = require("mschema");

// TODO: remove / move this module ?
module['exports'] = function validateServiceInput (service, req, res, cb) {
  var untrustedSchema = service.schema || {};
  var defaults = mschema.validate(req.resource.params, service.schema || {}, { strict: false });
  return cb(null, defaults);
};