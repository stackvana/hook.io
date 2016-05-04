var hook = require('../lib/resources/hook');

module['exports'] = function view (opts, callback) {

  var $ = this.$;

  var req = opts.request,
      res = opts.response,
      params = req.resource.params;

  if (typeof params.signedMeUp !== "undefined" || typeof params.s !== "undefined") {
    req.session.referredBy = req.params.owner;
    return res.redirect("/");
  }

  if (!opts.request.isAuthenticated()) { 
    return res.redirect('/login');
    //$('.navBar').remove()
  }

  hook.find({owner: req.session.user }, function (err, hooks){
    if (err) {
      return res.end(err.message);
    }

    // if there is no referral set, assign one based on the owner of the current hook
    if (typeof req.session.referredBy === "undefined") {
      req.session.referredBy = req.params.owner;
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
          priv = "Private ";
        }
        $('.hooks').append('<tr><td class="col-md-8">' + priv + '<a href="' + hookLink + '/admin">' + hooks[h].name + '</a></td><td class="col-md-4" align="right"><a href="' + hookLink + '"><span class="mega-octicon octicon-triangle-right" style="min-width: 32px;"></span></a>&nbsp;&nbsp;<a href="' + hookLink + '/source"><span class="mega-octicon octicon-file-code" style="min-width: 32px;"></span></a>&nbsp;&nbsp;<a href="' + hookLink + '/logs"><span class="mega-octicon octicon-list-ordered" style="min-width: 32px;"></span></a>&nbsp;&nbsp;<a class="deleteLink" data-name="' + hooks[h].owner + "/" + hooks[h].name +'" href="' + hookLink + '/delete"><span class="mega-octicon octicon-trashcan" style="min-width: 32px;"></span></a></td></tr>')
      }


      if (Object.keys(hooks).length > 0) {
        $('.noHooks').remove();
      }
    } else {
      //$('.navBar').remove();
      
    }
    callback(null, $.html());
  });


};