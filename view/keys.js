var forms = require('resource-forms'),
keys = require('../lib/resources/keys'),
mschemaForms = require('mschema-forms');

var uuid = require('node-uuid');

var role = require('../lib/resources/role');
var checkRoleAccess = require('../lib/server/routeHandlers/checkRoleAccess');

var mergeParams = require('./mergeParams');
var bodyParser = require('body-parser');
var config = require('../config');


module['exports'] = function view (opts, callback) {

   var req = opts.request,
       res = opts.response,
       $ = this.$;

 // TODO: only show form if logged in, if not, show login form

 checkRoleAccess({ req: req, res: res, roles: "keys::read" }, function (err, hasPermission) {
   if (hasPermission) {
     $('.loginBar').remove();
     finish();
   } else {
     // if not logged in, kick out
     if (!req.isAuthenticated()) {
       $('.keys').remove();
       req.session.redirectTo = "/keys";
       return callback(null, $.html());
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
     req.session.user = "marak";
     req.resource.params.owner = req.session.user;

     if (typeof req.resource.params.roles === "string") {
       req.resource.params.roles = [req.resource.params.roles];
     }

     console.log('rrr', req.resource.params);
     var middle = forms.generate({
        view: 'grid-with-form',
        resource: keys,
        action: '/keys',
        params: req.resource.params,
        query: { owner: req.session.user },
        useLayout: false,
        form: {
          create: {
            legend: 'Generate a new Key',
            submit: "Add Key"
          },
          grid: {
            legend: 'Your Keys'
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
          roles: {
            label: "<h3>Roles</h3>",
            type: "string",
            format: "checkbox",
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
        callback(null, $.html());
        return;
        });
      });
 }

};