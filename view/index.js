module['exports'] = function view (opts, callback) {

  var $ = this.$,
      user = opts.request.user;

  if (typeof user === "undefined") {
    $('.userBar').remove();
  } else {
    $('.userBar .welcome').html('Welcome <strong>' + user.username + "</strong>!")
    $('.loginBar').remove();
    $('.tagline').remove();
    $('.yourHooks').attr("href", "/" + user.username);
    $('.splash').remove();
  }
  
  callback(null, this.$.html());
};