var forms = require('resource-forms'),
keys = require('../../lib/resources/keys'),
mschemaForms = require('mschema-forms');

var uuid = require('node-uuid');

var role = require('../../lib/resources/role');
var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var mschema = require('mschema');

var mergeParams = require('../mergeParams');
var bodyParser = require('body-parser');
var config = require('../../config');


module['exports'] = function view (opts, callback) {

   var req = opts.request,
       res = opts.response,
       $ = this.$;

 var self = this;
 self.schema = self.schema || {};

 $ = req.white($);

 // TODO: only show form if logged in, if not, show login form
 var appName = req.hostname;

 if (!req.isAuthenticated()) {
   $('.keys').remove();
   // return callback(null, $.html());
 } else {
   $('.loginLink').remove();
 }

 // TODO: move to resource.before hooks
 checkRoleAccess({ req: req, res: res, role: "keys::read" }, function (err, hasPermission) {
   if (hasPermission) {
     $('.loginBar').remove();
     finish();
   } else {
     if (req.jsonResponse) {
       return res.end(config.messages.unauthorizedRoleAccess(req, "keys::read"));
     }
     // if not logged in, kick out
     if (!req.isAuthenticated()) {
       
       $('.keys').remove();
       req.session.redirectTo = "/keys";
       var out = $.html();
       out = out.replace(/\{\{appName\}\}/g, appName);
       return callback(null, out);
       
       //return res.redirect('/login');
     } else {
       $('.loginBar').remove();
       finish();
     }
   }
 });

 function finish () {
   bodyParser()(req, res, function bodyParsed() {
     mergeParams(req, res, function (){});

     if (typeof req.resource.params.roles === "string") {
       req.resource.params.roles = [req.resource.params.roles];
     }

     if (req.jsonResponse) {
       if (req.method === "POST") {
         var validate = mschema.validate(req.resource.params, self.schema);
         if (!validate.valid) {
           validate.status = "error";
           return res.json(validate);
         } else {
           return keys.create(req.resource.params, function(err, result){
             if (err) {
               return res.end(err.message)
             }
             return res.json(result);
           });
         }
       } else {
         return res.json({ "status": "autodocs"});
       } 
     }

     req.resource.params.roles = req.resource.params.roles || [];
     if (typeof req.resource.params.customRoles === "string") {
       // split by comma value for multiple roles
       // TODO: trim any whitespace ?
       var customRoles = req.resource.params.customRoles.split(',');
       customRoles.forEach(function(customRole){
         req.resource.params.roles.push(customRole);
       });
     }
     //console.log('merged params', req.resource.params)

     var middle = forms.generate({
        view: 'grid-with-form',
        resource: keys,
        action: '/keys',
        params: req.resource.params,
        req: req,
        res: res,
        query: { owner: req.session.user },
        useLayout: false,
        form: {
          create: {
            legend: 'Generate a new Key',
            submit: "Add Key"
          },
          grid: {
            legend: 'Your Keys',
            keys: ['name', 'hook_private_key', 'roles']
          }
        },
        schema: {
          name: {
            type: 'string',
            label: '<h3>Name</h3>',
            description: 'Your custom domain name. Example: marak.com',
            placeholder: 'admin-access-key',
            required: true,
            minLength: 1,
            maxLength: 50
          },
          owner: {
            type: 'string',
            format: 'hidden',
            description: 'Your custom domain name. Example: marak.com',
            required: true,
            minLength: 1,
            maxLength: 50,
            default: req.session.user
          },
          /*
          ,
          hook_public_key: {
            type: 'string',
            label: "Public Key",
            description: 'your public key',
            required: true,
            minLength: 1,
            maxLength: 255,
            size: 40,
            disabled: true,
            //            default: "public-" + new Date().getTime()
            default: uuid()
          },
          */
          hook_private_key: {
            type: 'string',
            label: "Private Key",
            description: 'Your custom domain name. Example: marak.com',
            required: true,
            minLength: 1,
            maxLength: 255,
            size: 40,
            default: uuid(),
            private: true
          },
          customRoles: {
            label: "<h3>Custom Roles</h3>",
            type: "string",
            placeholder: 'foo::bar,hook::custom1,files::admin',
            // TODO: make actual array type instead of string
            // type: "array",
            required: false
          },
          roles: {
            label: "<h3>Roles</h3>",
            type: "string",
            format: "checkbox",
            // TODO: make actual array type instead of string
            // type: "array",
            customValue: true,
            selectAll: true,
            selectNone: true,
            enum: Object.keys(role.roles),
            defaultState: "checked",
            required: true
          }
          /*
          key_type: {
            type: 'string',
            label: "Key Type",
            enum: ['user', 'service'],
            description: 'Your custom domain name. Example: marak.com',
            required: true,
            minLength: 1,
            maxLength: 50
          },
          */
        }
      }, function (err, result){
        if (err) {
          return res.end(err.message);
        }
        $('.keys').html(result);
        return callback(null, $.html());
        });
      });
 }

};

module['exports'].schema = {
  name: {
    type: 'string',
    required: true
  },
  owner: {
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