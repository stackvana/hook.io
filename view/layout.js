module['exports'] = function view (opts, callback) {
  var req = opts.request,
      params = req.resource.params,
      $ = this.$;
  if (req.user && req.session.user) {
    $('.myHooks').attr('href', '/' + req.session.user);
  }

  if (params.lang) {
    req.i18n.setLocale(params.lang);
  }

  var i = req.i18n;

  //$('title').html(i.__('hook.io - Free Microservice and Webhook Hosting. Deploy your code in seconds.'));
  //$('.splash').html(i.__('Instantly Build and Deploy HTTP Microservices'));
  $('.supportedLang').html(i.__("%s Supported Programming Languages", "11+"));
  //$('.deploymentsLink').html(i.__("Deployments"));

  $('.features li a').each(function(index, item){
    var v = $(item).html();
    $(item).html(i.__(v));
  });

  $('#footer .i18n').each(function(index, item){
    var v = $(item).html();
    $(item).html(i.__(v));
  });
  
  callback(null, $.html());
};