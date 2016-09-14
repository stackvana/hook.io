var config = require('../config');

module['exports'] = function view (opts, callback) {
  var req = opts.req,
      params = req.resource.params,
      $ = this.$;

  if (req.user && req.session.user) {
    $('.myHooks').attr('href', '/' + req.session.user);
  }

  if (!req.isAuthenticated()) {
    req.session.user = "anonymous";
    $('.logoutLink').remove();
  } else {
    $('.loginLink').remove();
  }

  var _url = require('url').parse(req.url).pathname;
  // console.log('WHAT IS PATH', _url)
  if (_url !== "/login" && _url !== "/signup" && _url !== "" && _url !== "/" && _url !== "/reset") {
    req.session.redirectTo = req.url;
  }

  if (params.lang) {
    req.i18n.setLocale(params.lang);
  }

  var acceptTypes = [];

  if (req.headers && req.headers.accept) {
    acceptTypes = req.headers.accept.split(',');
  }
  if (acceptTypes.indexOf('text/html') === -1) {
    req.jsonResponse = true;
  }

  var i = req.i18n;

  var pathName = require('url').parse(req.originalUrl).pathname;
  if (pathName !== "/") {
    $('.main-slider-area').remove();
  }
  $('.features li a').each(function(index, item){
    var v = $(item).html();
    $(item).html(i.__(v));
  });

  $('.i18n').each(function(index, item){
    var v = $(item).html();
    $(item).html(i.__(v));
  });

  if (typeof req.session === "undefined" || typeof req.session.user === "undefined" || req.session.user === "anonymous") {
    $('.emailReminder').remove();
  }

  if (typeof req.session.email === "undefined" || req.session.email.length === 0) {
    // no email found on account, we need to update the account!
  } else {
    $('.emailReminder').remove();
  }

  // generic white-label function for performing {{mustache}} style replacements of site data
  // Note: Site requires absolute links ( no relative links! )
  req.white = function whiteLabel ($, options) {
    var out = $.html();
    var appName = "hook.io",
        appAdminEmail = "hookmaster@hook.io",
        appPhonePrimary = "1-917-267-2516";

    // TODO: move configuration override to hook.io-white
    var white = {};
    if (req.hostname === "stackvana.com") {
      white.logo = "https://stackvana.com/img/stackvana-logo-inverse.png";
      white.logoInverse = "https://stackvana.com/img/stackvana-logo-inverse.png";
      white.name = "Stackvana";
      white.url = "https://stackvana.com";
      //white.url = "http://stackvana.com:9999";
      white.email = "support@stackvana.com";
    }
    out = out.replace(/\{\{appName\}\}/g, white.name || appName);
    out = out.replace(/\{\{appSdkName\}\}/g, white.appSdkName || "hook.io-sdk");
    out = out.replace(/\{\{appLogo\}\}/g, white.logo || config.app.logo);
    out = out.replace(/\{\{appLogoInverse\}\}/g, white.logoInverse || config.app.logoInverse);
    out = out.replace(/\{\{appDomain\}\}/g, config.app.domain);
    out = out.replace(/\{\{appUrl\}\}/g, white.url || config.app.url);
    out = out.replace(/\{\{appAdminEmail\}\}/g, white.email || appAdminEmail);
    out = out.replace(/\{\{appPhonePrimary\}\}/g, appPhonePrimary);
    return $.load(out);
  };

  $ = req.white($);

  callback(null, $.html());

};