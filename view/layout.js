var config = require('../config');
var i18n = require('i18n-2')
var moment = require('moment');
var TRIAL_DAYS_LIMIT = 60;

module['exports'] = function view (opts, callback) {
  var req = opts.req, res = opts.res,
      params = req.resource.params,
      $ = this.$;

  var opt = {
    request: req,
    locales: config.locales.locales,
    directory: require.resolve('hook.io-i18n').replace('index.js', '/locales')
  };
  opt.request = req;
  req.i18n = new i18n(opt);

  if (req.user && req.session.user) {
    $('.myHooks').attr('href', '/' + req.session.user);
  }

  if (!req.isAuthenticated()) {
    //req.session.user = "anonymous";
    $('.logoutLink').remove();
  } else {
    $('.loginLink').remove();
  }

  var _url = require('url').parse(req.url).pathname;
  // console.log('WHAT IS PATH', _url)
  if (_url !== "/login" && _url !== "/signup" && _url !== "" && _url !== "/" && _url !== "/reset") {
    req.session.redirectTo = req.url;
  }

  if (req.session.lang) {
    $('.currentLang').html(req.session.lang);
    req.i18n.setLocale(req.session.lang);
  }

  if (params.lang) {
    $('.currentLang').html(params.lang);
    req.i18n.setLocale(params.lang);
    req.session.lang = params.lang;
  }

  var acceptTypes = [];

  if (req.headers && req.headers.accept) {
    acceptTypes = req.headers.accept.split(',');
  }
  if (acceptTypes.indexOf('text/html') === -1) {
    req.jsonResponse = true;
  }

  if (req.resource.params._json) {
    req.jsonResponse = true;
  }

  // Express 3 ???
  /*
  if (res.locals) {
    i18n.registerMethods(res.locals, req)
  }
  */

  var i = req.i18n;
  //var i18n = require('./helpers/i18n');
  //i18n(i, $);

  var pathName = require('url').parse(req.originalUrl).pathname;
  if (pathName !== "/") {
    $('.main-slider-area').remove();
  }
  /*
  $('.features li a').each(function(index, item){
    var v = $(item).html();
    $(item).html(i.__(v));
  });
  */

  /*
  $('.i18n').each(function(index, item){
    var v = $(item).html();
    // console.log(v, i.__(v))
    $(item).html(i.__(v));
  });
  */

  // TODO: make this a redirect page instead of inserting into layout now that emails are required
  if (typeof req.session === "undefined" || typeof req.session.user === "undefined" || req.session.user === "anonymous") {
    $('.emailReminder').remove();
    $('.trialPeriod').remove();
  }

  // if no email found on account, we need to update the account!
  if (typeof req.session.email === "undefined" || req.session.email.length === 0) {
    // do not perform redirect if user is already on redirected page
    // do not perform redirect if request has indicated a json response ( most likely an API call )
    // TODO: only if logged in and not anonymous
    if (req.isAuthenticated()) {
      if (req.url !== '/email-required' && !req.jsonResponse) {
        return res.redirect(config.app.url + '/email-required');
      }
    }
  } else {
    $('.emailReminder').remove();
  }

  // if we have a valid session but there is no valid session user name...
  // assume we have created a new account with no registered account name
  if (req.isAuthenticated()) {
    if (typeof req.session.user === 'undefined' || req.session.user === 'anonymous') {
      // redirect to the register account page
      if (req.url !== '/register' && !req.jsonResponse && req.url !== '/session') {
        return res.redirect(307, config.app.url + '/register');
      }
    }
  } else {
    $('.trialPeriod').remove();
    $('.upgradeAccount').remove();
  }

  if (req.session && req.session.user === 'marak') {
    $('.logo a').attr('href', config.app.url + '/_admin')
  }

  //
  // Check to see if logged in account has expired it's trial period
  //

  var now = moment();
  var created = moment(req.session.user_ctime);
  var daysSinceCreation = now.diff(created, 'days');

  /*
  console.log('now', now);
  console.log('created', created);
  console.log('days left', daysSinceCreation);
  console.log('paidStatus', req.session.paidStatus, TRIAL_DAYS_LIMIT - daysSinceCreation)
  */
  var trialPages = ['/account', '/pricing', '/account/expired', '/account/usage', '/account/delete', '/contact', '/docs', '/register'];

  if ((req && req.session && req.session.paidStatus === "paid")) {
    // do nothing
    // paid users are not subject to 60 day trial
    $('.trialPeriod').remove();
    $('.upgradeAccount').remove();
  } else {
    if (req.session.servicePlan === 'free' || typeof req.session.servicePlan === 'undefined') {
      // `free` is used for accounts created before 5/7/2018
      $('.trialPeriod').remove();
      var now = moment();
      var created = moment('4/2/2019');
      var daysSinceCreation = now.diff(created, 'days');
      $('.daysLeftInTrial').html((TRIAL_DAYS_LIMIT - daysSinceCreation).toString());
      if (trialPages.indexOf(_url) !== -1) {
        $('.upgradeAccount').remove();
      }
    }

    if (typeof req.session.hideWarning !== 'undefined') {
      var warningHidden = moment(req.session.hideWarning);
      var minutesSinceClosed = warningHidden.diff(new Date(), 'minutes');
      // console.log('minutes since closed', minutesSinceClosed);
      // re-show warning every 30 minutes ( after user clicks hide )
      if (minutesSinceClosed >= -5) {
        $('.notice').remove();
        // req.hideWarnings = true; // not being used
      }
    }

    if (req.session.servicePlan === 'trial') {
      $('.upgradeAccount').remove();
    }

    if (trialPages.indexOf(_url) !== -1) {
      $('.boxAlert').remove();
    }

    if ((TRIAL_DAYS_LIMIT - daysSinceCreation) < 0) {
      // trial has expired, redirect to expired page ( but still allow to view pricng page )
      // todo: create array of allowed url values for expired accounts ( support / pricing / etc )
      // $('.upgradeAccount').remove();
      if (trialPages.indexOf(_url) === -1 && !req.jsonResponse) {
        return res.redirect(307, config.app.url + '/account/expired');
      }
      if (req.url !== '/account/expired' && req.url !== '/pricing' && req.url !== '/contact' && !req.jsonResponse) {
      }
    } else {
      if (trialPages.indexOf(req.url) !== -1) {
        $('.trialPeriod').remove();
        $('.upgradeAccount').remove();
      } else {
        // trial has not yet expired, but since account is not paid we should show a countdown on each page
        $('.daysLeftInTrial').html((TRIAL_DAYS_LIMIT - daysSinceCreation).toString());
        $('.accountCreated').html(created.toString());
      }
    }

  }

  /*
  $('.daysLeftInTrial').html((TRIAL_DAYS_LIMIT - daysSinceCreation).toString());
  $('.accountCreated').html(created.toString());
  */

  // generic white-label function for performing {{mustache}} style replacements of site data
  // Note: Site requires absolute links ( no relative links! )
  req.white = function whiteLabel ($, options) {
    $('.i18n').each(function(index, item){
      var v = $(item).html();
      // console.log(v, i.__(v))
      $(item).html(i.__(v));
    });

    var out = $.html();
    var appName = "hook.io",
        appAdminEmail = "marak@hook.io",
        appPhonePrimary = "";

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
    out = out.replace(/\{\{appWs\}\}/g, white.url || config.app.ws);
    out = out.replace(/\{\{appDomain\}\}/g, white.host || config.app.domain);
    out = out.replace(/\{\{appPort\}\}/g, white.port || config.app.port);
    out = out.replace(/\{\{appAdminEmail\}\}/g, white.email || appAdminEmail);
    out = out.replace(/\{\{appPhonePrimary\}\}/g, appPhonePrimary);
    out = out.replace(/\{\{balancerIP\}\}/g, config.balancer.publicIP);
    if (typeof req.session !== 'undefined') {
      out = out.replace(/\{\{userName\}\}/g, req.session.user || 'anonymous');
      out = out.replace(/\{\{userEmail\}\}/g, req.session.email);
    }
    out = out.replace(/\{\{username\}\}/g, req.session.user || 'anonymous');
    return $.load(out);
  };

  $ = req.white($);
  callback(null, $.html());

};