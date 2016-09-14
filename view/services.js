var hook = require('../lib/resources/hook');
var checkRoleAccess = require('../lib/server/routeHandlers/checkRoleAccess');
var config = require('../config');
var psr = require('parse-service-request');

module['exports'] = function view (opts, callback) {

  var $ = this.$;

  var req = opts.req,
      res = opts.res,
      params = req.resource.params;

  if (typeof params.signedMeUp !== "undefined" || typeof params.s !== "undefined") {
    req.session.referredBy = req.params.owner;
    //return res.redirect("/");
  }

  /*
  var loggedIn = false;
  if (!opts.request.isAuthenticated()) {
    loggedIn = true;
    //return res.redirect('/login');
    //$('.navBar').remove()
  }
  */

  psr(req, res, function (req, res, fields){
    for (var p in fields) {
      params[p] = fields[p];
    }
    checkRoleAccess({ req: req, res: res, role: "hook::find" }, function (err, hasPermission) {
      if (!hasPermission /* || req.resource.owner === "anonymous" */ ) { // don't allow anonymous hook listing?
        if (req.jsonResponse !== true && typeof params.hook_private_key === "undefined") {
          req.session.redirectTo = "/services";
          return res.redirect('/login');
        }
        return res.end(config.messages.unauthorizedRoleAccess(req, "hook::find"));
      } else {
        finish();
      }
    });
  });

  function finish () {
    $ = req.white($);
    params.query = params.query || {};
    var _owner = params.query.owner || req.resource.owner || req.params.owner || req.session.user;
    var query = {};

    for(var p in params.query) {
      query[p] = params.query[p];
    }
    query.owner = _owner;

    hook.find(query , function (err, hooks){
      if (err) {
        return res.end(err.message);
      }

      if (req.jsonResponse) {
        return res.json(hooks);
      }
      // if there is no referral set, assign one based on the owner of the current hook
      if (typeof req.session.referredBy === "undefined") {
        req.session.referredBy = req.params.owner;
      }
      if (req.params.owner !== req.session.user) {
        //$('.navBar').remove();
        $('.servicesHeader').html(req.params.owner);
      }
      if (hooks.length > 0) {
        // sort hooks alphabetically by name
        hooks = hooks.sort(function(a,b){
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;
          return 0;
        });

        // if current user is not owner, filter out private hooks
         hooks = hooks.filter(function(item){
          if (item.isPrivate && item.owner !== req.session.user.toLowerCase()) {
            return false;
          }
          return item;
        });

        for (var h in hooks) {
          // TODO: add ability to delete hooks https://github.com/bigcompany/hook.io/issues/47
          var hookLink = "/" + hooks[h].owner + "/" + hooks[h].name + "";
          var priv = "";
          if (hooks[h].isPrivate) {
            priv = '<span title="Private Service / Restricted Access" class="octicon octicon-lock"></span> ';
            if (req.params.owner === req.session.user) {
              $('.hooks').append('<tr><td class="col-md-8">' + priv + '<a title="Hook Admin" href="' + hookLink + '/admin">' + hooks[h].name + '</a></td><td class="col-md-1" align="left"><a title="Run Hook" href="' + hookLink + '"><span class="mega-octicon octicon-triangle-right"></span></a></td><td class="col-md-1" align="left"><a title="View Source" href="' + hookLink + '/source"><span class="mega-octicon octicon-file-code"></span></a></td><td class="col-md-1" align="left"><a title="View Logs" href="' + hookLink + '/logs"><span class="mega-octicon octicon-list-ordered"></span></a></td><td class="col-md-1" align="left"><a title="Delete Hook" class="deleteLink" data-name="' + hooks[h].owner + "/" + hooks[h].name +'" href="' + hookLink + '/delete"><span class="mega-octicon octicon-trashcan"></span></a></td></tr>')
            }
          } else {
            $('.hooks').append('<tr><td class="col-md-8">' + priv + '<a title="Hook Admin" href="' + hookLink + '/admin">' + hooks[h].name + '</a></td><td class="col-md-1" align="left"><a title="Run Hook" href="' + hookLink + '"><span class="mega-octicon octicon-triangle-right"></span></a></td><td class="col-md-1" align="left"><a title="View Source" href="' + hookLink + '/source"><span class="mega-octicon octicon-file-code"></span></a></td><td class="col-md-1" align="left"><a title="View Logs" href="' + hookLink + '/logs"><span class="mega-octicon octicon-list-ordered"></span></a></td><td class="col-md-1" align="left"><a title="Delete Hook" class="deleteLink" data-name="' + hooks[h].owner + "/" + hooks[h].name +'" href="' + hookLink + '/delete"><span class="mega-octicon octicon-trashcan"></span></a></td></tr>')
          }
        }

        if (Object.keys(hooks).length > 0) {
          $('.noHooks').remove();
        } else {
          $('.hooks').remove();
        }
      } else {
        //$('.navBar').remove();
      }
      callback(null, $.html());
    });
  }


};