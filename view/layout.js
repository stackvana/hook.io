module['exports'] = function view (opts, callback) {
  var req = opts.request
      $ = this.$;
  if (req.user && req.session.user) {
    $('.myHooks').attr('href', '/' + req.session.user);
  }
  $('title').html('hook.io - Free Microservice and Webhook Hosting. Deploy your code in seconds.');
  
  callback(null, $.html());
};