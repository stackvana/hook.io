var mschema = require("mschema");


module['exports'] = function validateServiceInput (service, req, res, cb) {

  var untrustedSchema = service.schema || {};
  var defaults = mschema.validate(req.resource.params, service.schema || {}, { strict: false });

  if (defaults.valid === false) {

   // Remark: Let's reserve 500 errors for actual hook.io server errors,
   // Do not use 500 code for hook input validation errors.

   // Remark: Let's not write to the response for validation errors here,
   // better to continue forward with the error and let whoever called Hook.run handle the output

   //_res.writeHead(500);
   //_res.write(JSON.stringify(defaults.errors, true, 2));
   //_res.end();
   //return;

   // An input validation error occurred, continue forward without trying to run the untrustedHook
   return cb(defaults.errors);
  }
  
  return cb(null, defaults.instance);
  
};