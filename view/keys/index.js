var keys = require('../../lib/resources/keys'),
forms = require('mschema-forms');

var uuid = require('node-uuid');

var role = require('../../lib/resources/role');
var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var mschema = require('mschema');

var mergeParams = require('merge-params');
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
   $('.keysStatus').remove();
   // return callback(null, $.html());
 } else {
   $('.loginLink').remove();
   $('.keysMenu').remove();
 }

 // TODO: move to resource.before hooks
 var _role = "keys::read";
 if (req.method === "POST") {
   _role = "keys::create";
 }

 checkRoleAccess({ req: req, res: res, role: _role }, function (err, hasPermission) {
   if (hasPermission) {
     $('.loginBar').remove();
     finish();
   } else {
     if (req.jsonResponse) {
       return res.end(config.messages.unauthorizedRoleAccess(req, role));
     }
     // if not logged in, kick out
     if (!req.isAuthenticated()) {
       $('.keys').remove();
       $('.myKeys').remove();
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
   var keySchema = {
     name: {
       type: 'string',
       label: '<h3>Name</h3>',
       placeholder: 'admin-access-key',
       required: true,
       minLength: 1,
       maxLength: 50
     },
     /*
     owner: {
       type: 'string',
       format: 'hidden',
       required: true,
       minLength: 1,
       maxLength: 50,
       default: req.session.user
     },
     */
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
       required: true,
       minLength: 1,
       maxLength: 255,
       size: 40,
       default: uuid(),
       private: true
     },
     roles: {
       label: "<h3>Roles</h3>",
       description: "pick granular roles",
       type: "string",
       format: "checkbox",
       // TODO: make actual array type instead of string
       // type: "array",
       customValue: true,
       selectAll: true,
       selectNone: true,
       enum: role.roles,
       defaultState: "checked",
       required: true
     },
     customRoles: {
       label: "<h3>Custom Roles</h3>",
       hint: 'You can specify a custom string as a new role. This can be checked using a <a href="/roles#custom-role-checks">Custom Role Check</a>',
       type: "string",
       placeholder: 'foo::bar,hook::custom1,files::admin',
       // TODO: make actual array type instead of string
       // type: "array",
       required: false,
       default: ""
     },
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
   };
   bodyParser()(req, res, function bodyParsed() {
     mergeParams(req, res, function (){});

    if (typeof req.resource.params.roles === "string") {
      req.resource.params.roles = [req.resource.params.roles];
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

    var params = req.resource.params;
    if (typeof params.submitted !== 'undefined') {
      // process posted form data
      params.owner = req.session.user;
      return keys.create(params, function (err, result) {
        if (err) {
          return res.end(err.message);
        }
        $('.status').html('Created!');
        showForms();
      });
    } else {
      if (params.destroy) {
        // TODO: add role check
        $('.status').html('Deleted!');
        return keys.destroy(params.id, function (err) {
          if (err) {
            return res.end(err.message);
          }
          showForms();
        });
      } else {
        showForms();
      }
    }

     function showForms () {
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

       //console.log('merged params', req.resource.params)
       var middle = forms.generate({
          view: 'generic',
          resource: keys,
          action: '/keys',
          params: req.resource.params,
          req: req,
          res: res,
          query: { owner: req.session.user },
          useLayout: false,
          form: {
            legend: 'Create New Key',
            submit: "Add Key",
            showDestroyButton: true
          },
          schema: keySchema
        }, function (err, result) {
          if (err) {
            return res.end(err.message);
          }
          $('.keysForm').html(result);

          keys.find({ owner: req.session.user }, function (err, _keys) {
            if (err) {
              return res.end(err.message);
            }
            _keys = _keys.filter(function (item) {
              if (item.key_type === "internal") {
                // do not show interal api key to user
                return false;
              }
              return true;
            });
            if (_keys.length === 0) {
              $('.keyHolder').append('<h3>No API Keys Have Been Created</h3>')
              return callback(null, $.html());
            }
            if (req.session.serviceLimits) {
              $('.keyUsage').html(_keys.length + '/' + req.session.serviceLimits.apiKeys);
            }
            _keys.forEach(function(k){
              var table = '<table class="table well">';
              var deleteLink = '<a class="destroyLink" data-name="' + k.name + '" href="?'  + 'destroy=true&id='  + k.id + '">' + 'destroy' + '</a>';
              table += '<tr><td><strong>name: ' + '</strong>' + k.name + '</td>' + '<td><strong>hook_private_key:</strong> <input size="36" readonly="readonly" value="' + k.hook_private_key + '"/></td><td>' + deleteLink + '</td></tr>';
              if (typeof k.roles === "string") {
                k.roles = k.roles.split(',');
              }
              k.roles.sort();
              if (typeof k.roles === 'object' && k.roles.length > 0) {
                var str = '<ul class="list-inline">';
                k.roles.forEach(function(r){
                  var desc = '';
                  if (role.roles[r] && role.roles[r].description) {
                    desc = role.roles[r].description;
                  }
                  str += '<li class="roleItem" title="' + desc + '">' + r + '</li>';
                });
                str += '</ul>';
                table += '<tr><td colspan="3">' + str + '</td>' + '</tr>';
              }
              table += '<table>';
              $('.keyHolder').append(table);
            });

            return callback(null, $.html());
            /*
            forms.generate({
                type: 'grid',
                data: _keys,
                action: '/keys',
                params: req.resource.params,
                req: req,
                res: res,
                query: { owner: req.session.user },
                useLayout: false,
                form: {
                  legend: 'Your Keys',
                  keys: ['name', 'hook_private_key', 'customRoles', 'roles'],
                  showDestroyButton: true
                },
                schema: keySchema
            }, function (err, _h) {
            });
            */
          });
        });
     }
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