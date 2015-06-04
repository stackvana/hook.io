module['exports'] = function view (opts, callback) {

  var $ = this.$;

  var req = opts.request,
      res = opts.response,
      params = req.resource.params;

  if (typeof params.signedMeUp !== "undefined" || typeof params.s !== "undefined") {
    req.session.referredBy = req.params.username;
    return res.redirect("/");
  }

  if (!opts.request.isAuthenticated()) { 
    $('.navBar').remove()
  }

  // if there is no referral set, assign one based on the owner of the current hook
  if (typeof req.session.referredBy === "undefined") {
    req.session.referredBy = req.params.username;
  }

  // sort hooks alphabetically by name
  opts.hooks = opts.hooks.sort(function(a,b){
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });

  for (var h in opts.hooks) {
    // TODO: add ability to delete hooks https://github.com/bigcompany/hook.io/issues/47
    var hookLink = "/" + opts.hooks[h].owner + "/" + opts.hooks[h].name + "";
    if (req.user && req.params.username.toLowerCase() === req.user.username.toLowerCase()) {
      $('.hooks').append('<tr><td class="col-md-8"><a href="' + hookLink + '">' + opts.hooks[h].name + '</a></td><td class="col-md-4" align="right"><a href="' + hookLink + '?admin=true"><span class="mega-octicon octicon-home" style="min-width: 32px;"></span></a>&nbsp;&nbsp;<a class="deleteLink" data-name="' + opts.hooks[h].owner + "/" + opts.hooks[h].name +'" href="' + hookLink + '?delete=true"><span class="mega-octicon octicon-trashcan" style="min-width: 32px;"></span></a></td></tr>')
    } else {
      $('.hooks').append('<tr><td><a href="' + hookLink + '">' + opts.hooks[h].name + '</a></td></tr>')
    }
  }

  if (typeof opts.hooks === "object") {
    if (Object.keys(opts.hooks).length > 0) {
      $('.noHooks').remove();
    }
  }

  callback(null, this.$.html());
};