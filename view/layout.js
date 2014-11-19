module['exports'] = function view (opts, callback) {
  var req = opts.request
      $ = this.$;
  if (req.user && req.user.username) {
    $('.myHooks').attr('href', '/' + req.user.username);
  }
  $('title').html('hook.io - Free Microservice and Webhook Hosting. Deploy your code in seconds.');
  
  callback(null, $.html());
};