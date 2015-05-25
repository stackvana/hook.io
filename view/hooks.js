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
    req.session.referredBy = req.hook.owner;
  }

  for (var h in opts.hooks) {
    // TODO: add ability to delete hooks https://github.com/bigcompany/hook.io/issues/47
    if (req.params.username.toLowerCase() === req.user.username.toLowerCase()) {
      // $('.hooks').append('<tr><td><a href="/' + opts.hooks[h].owner + "/" + opts.hooks[h].name + '">' + opts.hooks[h].name + '</a></td><td><a href="">Delete</a></td></tr>')
    } else {
      // $('.hooks').append('<tr><td><a href="/' + opts.hooks[h].owner + "/" + opts.hooks[h].name + '">' + opts.hooks[h].name + '</a></td></tr>')
    }
    $('.hooks').append('<tr><td><a href="/' + opts.hooks[h].owner + "/" + opts.hooks[h].name + '">' + opts.hooks[h].name + '</a></td></tr>')
  }

  if (typeof opts.hooks === "object") {
    if (Object.keys(opts.hooks).length > 0) {
      $('.noHooks').remove();
    }
  }

  callback(null, this.$.html());
};