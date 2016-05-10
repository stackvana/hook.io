var big = require('big');
var view = require('view');

var config = require('../config');

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

  var views = big.server.app.view;

  // TODO: add roles and groups
  if (req.session.user.toLowerCase() !== "marak") {
    return res.redirect('/services');
  }

  /* not needed? can just check sessio name above?
    if (!req.isAuthenticated()) {
      req.session.redirectTo = "/_admin";
      return res.redirect('/login');
    }
  */

   psr(req, res, function(req, res) {
     var params = req.resource.params;

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
            $('.user .json').html(JSON.stringify(_user, true, 2));
            $('.loginAs').attr('href', '?loginAs=' + params.name )
            return callback(null, $.html());
          })
        });
      } else {
        $('.user').remove();
      }

      if (params.removeUser) {
        console.log('looking for removing using')
        return user.find({ name: params.removeUser }, function (err, results) {

          if (err) {
            return res.end(err.message);
          }
          if (results.length === 0) {
            return res.json({
              status: "invalid",
              user: params.removeUser
            });
          }

          var u = results[0];
          // delete the user ( warning: this is intended for testing purposes only )
          u.destroy(function (err) {
            if (err) {
              return res.end(err.message);
            }
            return res.json({
              status: "deleted",
              user: params.removeUser
            });
          });

        });
      }

      // This reload in-process code seems a bit buggy. Better to not use / put logic directly into View library with tests
      if (params.refreshView) {

        // TODO: nested / multilevel views
        var fs = require('fs');
        var v, t, p;

        return fs.readFile(__dirname + "/" + params.refreshView + ".html", function (err, _t) {

          if (err) {
            return res.end(err.message);
          }

          t = _t.toString();
          fs.readFile(__dirname + "/" + params.refreshView + ".js", function (err, _p) {

            if (err) {
              // dont do anything, just ignore presenter because it doesnt exist
              //return res.end(err.message);
            } else {
              p = _p.toString();
            }

            var paths = params.refreshView.split('/');

            // TODO: multiple nested levels
            var _p;
            if (paths.length === 1) {
              _p = paths[0];
              v = views[paths[0]];
            } else {
              _p = paths[0] + "-" + paths[1];
              v = views[paths[0]].views[paths[1]];
            }
            v.template = _t;
            if (p) {
              v.presenter = loadPresenter({ 'owner': 'hookio', 'name': _p }, p);
            }

            return res.end('attempting to refresh ' + params.refreshView);

          })

        })
      }

      /*

        Render Views Table representing all views on site

      */
      /*
      var link = function (v) {
        return '<a href="' + v + '">' + v + '</a>';
      };
      Object.keys(views).forEach(function(k){
        if (typeof views[k] !== "object") {
          return;
        }
        $('.table').append('<tr><td><a href="{{appUrl}}/_admin?refreshView=' + k + '">Reload</a></td><td>' + link('/' + k) + '</td></tr>');
        var sub = views[k].views;
        if (typeof sub === "object") {
          Object.keys(sub).forEach(function(s){
            $('.table').append('<tr><td><a href="{{appUrl}}/_admin?refreshView=' + k + "/" + s + '">Reload</a></td><td>' + link('/' + k + "/" + s) + '</td></tr>');
          });
        }
      });
      */
      return callback(null, $.html());
   })




};