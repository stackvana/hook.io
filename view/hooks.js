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

  for(var h in opts.hooks) {
    $('.hooks').append('<tr><td><a href="/' + opts.hooks[h].owner + "/" + opts.hooks[h].name + '">' + opts.hooks[h].name + '</a></td></tr>')
  }

  if (typeof opts.hooks === "object") {
    if (Object.keys(opts.hooks).length > 0) {
      $('.noHooks').remove();
    }
  }

  callback(null, this.$.html());
};