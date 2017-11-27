var big = require('big');
var view = require('view');

var config = require('../config');
var forms = require('mschema-forms');
var user = require('../lib/resources/user');
var cache = require('../lib/resources/cache');
var servicePlan = require('../lib/resources/servicePlan');
var bodyParser = require('body-parser');
var mergeParams = require('merge-params');
var psr = require('parse-service-request');
var colors = require('colors');
var df = require('dateformat');

// user schema used for form
var userSchema = {
  name: { type: 'string', required: true },
  email: { type: 'string', format: 'email', required: false },
};

module['exports'] = function view (opts, callback) {
  var $ = this.$;

  var req = opts.request,
      res = opts.response;
  $ = req.white($);

  var views = big.server.app.view;


  // TODO: create special hard-coded admin key for super-admin privledges
  // This key works outside of the role system ( is a super admin, only one per system defined in config )

  /* not needed? can just check sessio name above?
    if (!req.isAuthenticated()) {
      req.session.redirectTo = "/_admin";
      return res.redirect('/login');
    }
  */

  /*

    Render Views Table representing all views on site

  */
  /* */
  var link = function (v) {
    return '<a href="' + v + '">' + v + '</a>';
  };
  Object.keys(views).forEach(function(k){
    if (typeof views[k] !== "object") {
      return;
    }
    $('.table').append('<tr><td>' + link('/' + k) + '</td></tr>');
    var sub = views[k].views;
    if (typeof sub === "object") {
      Object.keys(sub).forEach(function(s){
        $('.table').append('<tr><td>' + link('/' + k + "/" + s) + '</td></tr>');
      });
    }
  });

   psr(req, res, function(req, res) {
     var params = req.resource.params;

     if (params.super_private_key === config.superadmin.super_private_key || req.session.user === "marak") {
       switch (params.method) {
         case 'user.destroy':
           return destroyUser();
         break;
         /*
         default:
          return res.json({
            status: 'error',
            message: "unknown method " + params.method
          });
         break;
         */
       }
     }

      // TODO: add roles and groups
      if (typeof req.session.user === "undefined" || req.session.user.toLowerCase() !== "marak") {
        req.session.redirectTo = "/new";
        return res.redirect('/services');
      }

      // Special line only used for local docker dev
      // Not used in production
      if (typeof params.setBase === "string" && params.setBase.length > 0) {
        // update the baseUrl in the config
        var url = require('url');
        config.app.url = "http://" + req.host + ":" + (params.port || "80");
        return res.end('set baseUrl to: ' + config.app.url)
      }

     function loadPresenter (code, callback) {
        var _presenter, 
            err = null;
        // try to compile the hot-code into a module
        var id = new Date().getTime();
        try {
          var Module = module.constructor;
          var m = new Module();
          var name = 'presenterCode-' + id;
          delete require.cache[name];
          m.paths = module.paths;
          m._compile(code, name);
        } catch (err) {
          // console.log('err', err)
          return res.end(err.message);
        }
        return m.exports;
      };

      if (typeof params.loginAs !== "undefined" && params.loginAs.length > 0) {
        // Is this enough to trigger new session?
        // I think instead we should actually clear session / relogin using a token?
        req.session.user = params.loginAs;
        // TODO: we do need to get users email here too?
        delete req.session.email;
        return res.redirect('/services');
      }

      var type = "unknown", val;
      var query = {};

      if (typeof params.name !== "undefined" && params.name.length > 0) {
        type = "name";
        val = params.name;
      }

      if (typeof params.email !== "undefined" && params.email.length > 0) {
        type = "email";
        val = params.email;
      }

      query[type] = val;

      if (type !== "unknown") {
        return user.findOne(query, function (err, _user) {
          if (err) {
            return res.end(err.message);
          }


          $('.destroyUser').attr('href', '?method=user.destroy&name=' + _user.name + '&email=' + _user.email);
          // $('.user .json').html(JSON.stringify(_user, true, 2));
          $('.loginAs').attr('href', '?loginAs=' + _user.name );

          if (req.method === "POST") {
            if (params.paidStatus) {
              _user.paidStatus = params.paidStatus;
            }
            if (params.servicePlan) {
              _user.servicePlan = params.servicePlan;
            }
            _user.save(function(err){
              if (err) {
                return res.end(err.message);
              }
              generateForms(callback);
            })
          } else {
            generateForms(callback)
          }

          function generateForms (callback) {
            var schema = forms.jsonToSchema(_user);
            // schema.ctime.type = "date";
            schema.ctime.formatter = function (str) {
              return df(str);
            }
            schema.mtime.formatter = function (str) {
              return df(str);
            }
            forms.generate({
              type: "read-only",
              schema: schema,
              form: {
                legend: "User Report"
              },
              data: _user,
              }, function (err, result){
                $('.userFormHolder').html(result);
                // generate small form with some essential properties for updating user
                generateUpdateForm(_user, function(err, html){
                  $('.userUpdateFormHolder').html(html);
                  return callback(null, $.html());
                })
            });
          }

        });
      } else {
        $('.user').remove();
      }

      function destroyUser () {

        if ((typeof params.name === "undefined" || params.name.length === 0) && (typeof params.email === "undefined" || params.email.length === 0)) {
          return res.json({
            result: "invalid",
            user: params.user
          });
        }

        // odd behavior here on undefined, it is a string
        if (params.name === 'undefined') {
          params.name = undefined;
        }

        if (params.email === 'undefined') {
          params.email = undefined;
        }

        // Remark: Not going to delete anything but the user document
        // Hooks / logs / etc all will be kept ( for now )
        // console.log('searching'.green, params)
        // Remark: not using findOne in-case we make duplicate user, can run multiple times and will delete duplicate each time
        return user.find({ name: params.name, email: params.email }, function (err, results) {

          if (err) {
            return res.end(err.message);
          }

          if (results.length === 0) {
            return res.json({
              result: "missing-account",
              user: params.user
            });
          }

          var u = results[0];
          // delete the user ( warning: this is intended for testing purposes only )
          return u.destroy(function (err) {
            if (err) {
              return res.end(err.message);
            }
            return res.json({
              result: "deleted",
              user: params.removeUser
            });
          });

        });
      }

      return callback(null, $.html());

   });

};

function generateUpdateForm (user, cb) {
  
  var formSchema = userSchema || {};

   formSchema.name = {
     default: user.name,
   };

   formSchema.previousName = {
     default: user.name
   };

   formSchema.email.default = user.email || "";
   // formSchema.email.disabled = true;

   /*
   formSchema.run = {
     "type": "string",
     "default": "true",
     "format": "hidden"
   };
   */
   formSchema.paidStatus = {
     "type": "string",
     "label": "account paid status",
     "enum": ['paid', 'unpaid'],
     "default": user.paidStatus
   };

   formSchema.servicePlan = {
     "type": "string",
     "label": "account service plan",
     "enum": Object.keys(servicePlan),
     "default": user.servicePlan
   };

   /*
   formSchema.githubOAuth = {
     "type": "string",
     "disabled": true,
     "enum": ["true", "false"],
     "default": "false",
     "label": "Account Linked To Github"
   };
   */
   if (typeof user.hostingCredits !== "number") {
     user.hostingCredits = 0;
   }

   if (user.hostingCredits > 0) {
     formSchema.hostingCredits = {
       "type": "number",
       "label": "hosting credits",
       "disabled": true,
       "default": user.hostingCredits
     }
   }

   forms.generate({
     type: "generic",
     form: {
       legend: "Account Information",
       submit: "Save",
       action: ""
     },
     schema: formSchema,
     }, function (err, result){
       cb(null, result);
   });
  
}