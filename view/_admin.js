var big = require('big');
var view = require('view');

var config = require('../config');
var forms = require('mschema-forms');
var user = require('../lib/resources/user');
var cache = require('../lib/resources/cache');
var bodyParser = require('body-parser');
var mergeParams = require('./mergeParams');
var psr = require('parse-service-request');
var colors = require('colors');

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

     if (params.super_private_key === config.superadmin.super_private_key) {
       switch (params.method) {
         case 'user.destroy':
           return destroyUser();
         break;
         default:
          return res.json({
            status: 'error',
            message: "unknown method " + params.method
          });
         break;
       }
     }

      // TODO: add roles and groups
      if (typeof req.session.user === "undefined" || req.session.user.toLowerCase() !== "marak") {
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
          if (params.paid) {
            _user.paidStatus = "paid";
          }
          if (params.unpaid) {
            _user.paidStatus = "unpaid";
          }
          _user.save(function(err){
            if (err) {
              return res.end(err.message);
            }
            
            // $('.user .json').html(JSON.stringify(_user, true, 2));
            $('.loginAs').attr('href', '?loginAs=' + params.name );
            $('.setPaid').attr('href', '?name=' + params.name + '&paid=true');
            $('.setUnpaid').attr('href', '?name=' + params.name + '&unpaid=true');

            forms.generate({
              type: "read-only",
              form: {
                legend: "User Form"
              },
              data: _user,
              }, function (err, result){
                $('.userFormHolder').html(result);
                return callback(null, $.html());
            });

          })
        });
      } else {
        $('.user').remove();
      }

      function destroyUser () {

        if (typeof params.name === "undefined" || params.name.length === 0) {
          return res.json({
            result: "invalid",
            user: params.user
          });
        }

        // Remark: not using findOne in-case we make duplicate user, can run multiple times and will delete duplicate each time
        return user.find({ name: params.name }, function (err, results) {

          if (err) {
            return res.end(err.message);
          }

          if (results.length === 0) {
            return res.json({
              result: "invalid",
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