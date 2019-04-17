var hook = require('../lib/resources/hook');
var checkRoleAccess = require('../lib/server/routeHandlers/checkRoleAccess');
var config = require('../config');
var psr = require('parse-service-request');
var metric = require('../lib/resources/metric');
var df = require('dateformat');
var ms = require('ms');

module['exports'] = function view (opts, callback) {

  var $ = this.$;

  var req = opts.req,
      res = opts.res,
      params = req.resource.params;

  if (typeof params.signedMeUp !== "undefined" || typeof params.s !== "undefined") {
    req.session.referredBy = req.params.owner;
    //return res.redirect("/");
  }

  if (!req.isAuthenticated() && req.url === "/services") {
    return res.redirect('/login');
  }

  /*
  var loggedIn = false;
  */

  psr(req, res, function (req, res, fields){
    for (var p in fields) {
      params[p] = fields[p];
    }
    return finish();
    /* bypass role check for now, anyone can view other users non-private hooks ( filter is performed below )
    checkRoleAccess({ req: req, res: res, role: "hook::find" }, function (err, hasPermission) {
      if (!hasPermission) { // don't allow anonymous hook listing?
        if (req.jsonResponse !== true && typeof params.hook_private_key === "undefined") {
          req.session.redirectTo = "/services";
          return res.redirect('/login');
        }
        return res.end(config.messages.unauthorizedRoleAccess(req, "hook::find"));
      } else {
        finish();
      }
    });
    */
  });

  function finish () {
    $ = req.white($);
    params.query = params.query || {};
    // TODO: allow public listing / index of public services
    //       currently it will only allow viewing of your own services
    var _owner = params.query.owner || req.resource.owner || req.params.owner || req.session.user;
    var query = {};

    for(var p in params.query) {
      query[p] = params.query[p];
    }
    query.owner = _owner;

    hook.find(query, function (err, hooks) {
      if (err) {
        return res.end(err.message);
      }
      // TODO: filter out private hooks if session owner doesn't match hook owner
      // if current user is not owner, filter out private hooks
       hooks = hooks.filter(function(item){
        if (typeof req.session.user === "undefined" && item.isPrivate) {
          return false
        }
        if (item.isPrivate && typeof req.session.user !== "undefined" && (item.owner !== req.session.user.toLowerCase())) {
          return false;
        }
        return item;
      });

      if (req.jsonResponse) {
        return res.json(hooks);
      }
      // if there is no referral set, assign one based on the owner of the current hook
      if (typeof req.session.referredBy === "undefined") {
        req.session.referredBy = req.params.owner;
      }
      if (req.params.owner !== req.session.user) {
        //$('.navBar').remove();
        $('.servicesHeader').html(req.params.owner);
      }
      if (params.registered) {
        $('.message').html(req.session.email + ' is now registered. <br/>');
      }
      if (hooks.length > 0) {
        // sort hooks alphabetically by name
        hooks = hooks.sort(function(a,b){
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;
          return 0;
        });

        var metricKeys = [];
        var multiGet = [];
        hooks.forEach(function (h) {
          multiGet.push(['hgetall', "/metric/" + h.owner + "/" + h.name + "/report"]);
        });

        // perform redis multi command to get all metrics for all services at once ( should be better performance than separate requests )
        metric.client.multi(multiGet).exec(function(err, reports){
          if (err) {
            return res.end(err.message);
          }
          renderTable(reports);
        })

        function renderTable (report) {
          var keys = {}
          // only show search bar if more than 3 services
          if (hooks.length <= 3) {
            $('.searchServices').remove()
          }
          hooks.forEach(function(h, i){
            var tpl = $('.hookTemplate').clone();
            var hookLink = "/" + h.owner + "/" + h.name;
            var lastRun = keys[hookLink + '/lastRun'];
            var lastComplete = keys[hookLink + '/lastComplete'];
            var hits = keys[hookLink + '/hits'];
            var running = keys[hookLink + '/running'];
            var priv = "";
            var hookUrl = config.app.url + '/' + h.owner + '/' + h.name;
            $('.hookName', tpl).html(h.name);
            $('.hookName', tpl).attr("href", hookUrl + '/admin');
            $('.hookAdmin', tpl).attr("href", hookUrl + '/admin');
            $('.runLink', tpl).attr('href', hookUrl);
            $('.hookLogs', tpl).attr('href', hookUrl + '/logs');
            $('.hookDelete', tpl).attr('href', hookUrl + '/delete');
            $('.hookDelete', tpl).attr('data-name', hookLink);
            $('.hookSource', tpl).attr('href', hookUrl + '/_src');
            //$('.hooks').append('<tr><td class="col-md-8">' + priv + '<a title="Hook Admin" href="' + hookLink + '/admin">' + h.name + '</a>' + '<pre>' +  JSON.stringify(report[i], true, 2) + '</pre>' +'</td><td class="col-md-1" align="left"><a title="Run Hook" href="' + hookLink + '"><span class="mega-octicon octicon-triangle-right"></span></a></td><td class="col-md-1" align="left"><a title="View Source" href="' + hookLink + '/source"><span class="mega-octicon octicon-file-code"></span></a></td><td class="col-md-1" align="left"><a title="View Logs" href="' + hookLink + '/logs"><span class="mega-octicon octicon-list-ordered"></span></a></td><td class="col-md-1" align="left"><a title="Delete Hook" class="deleteLink" data-name="' + h.owner + "/" + h.name +'" href="' + hookLink + '/delete"><span class="mega-octicon octicon-trashcan"></span></a></td></tr>');
            if (report[i] !== null) {
              // $('.hookReport', tpl).html(JSON.stringify(report[i]));
              // var diff = Number(report[i].lastEnd) - Number(report[i].lastStart);
              var lastStart = new Date(Number(report[i].lastStart)).toString();
              
              try {
                lastStart = df(lastStart , "mm/dd/yyyy HH:MM:ss Z");
              } catch (err) {
                lastStart = 'n/a';
              }

              var lastTime = Number(report[i].lastTime);

              try  {
                // $('.hookLastTime', tpl).html(ms(diff).toString());
                $('.hookLastTime', tpl).html(ms(lastTime).toString());
              } catch (err) {
                // do nothing. this error means that ms library had invalid parse value ( perhaps null or undefined )
              }
              if (lastTime > 0 && h.customTimeout <= lastTime) {
                $('.hookLastTime', tpl).addClass('error');
                if (h.language === "javascript") {
                  $('.timeoutMessage', tpl).html('Please ensure that <code>res.end();</code> or <code>hook.res.end();</code> are called in the script.');
                }
              } else {
                $('.hookTimeoutError', tpl).remove();
              }

              $('.hookLastStart', tpl).html(lastStart);
              $('.hookStatusCode', tpl).html(report[i].statusCode);
              $('.hookTotalHits', tpl).html(report[i].totalHits);
              $('.hookRunning', tpl).html(report[i].running);

              var now = new Date();
              var monthlyHitsKey = 'monthlyHits - ' + (now.getMonth() + 1) + '/' + now.getFullYear();

              $('.hookMonthlyHits', tpl).html(report[i][monthlyHitsKey]); // TODO: date format uplook
              if (report[i].statusCode === "500") {
                // 500 status code means the last time the hook completed it ended with an error
                // if this is the case, we should show user a warning and give information of viewing the logs
                // $('.hookStatus', tpl).remove();
                // $('.hookStatus', tpl).addClass('error');
              } else {
                $('.hookError', tpl).remove();
              }
            } else {
              $('.hookReportHolder', tpl).remove();
              $('.hookTimeoutError', tpl).remove();
              $('.hookError', tpl).remove();
            }
            $(tpl).removeClass('hookTemplate');
            if (h.isPrivate) {
              if (req.params.owner === req.session.user || req.url === "/services") {
                // TODO: update with clone and html template!
                $('.hooks').append('<tr>' + tpl + '</tr>');
              }
            } else {
              $('.privateHook', tpl).remove();
              $('.hooks').append('<tr>' + tpl + '</tr>');
            }
          });
          $('.noHooks').remove();
          $('.hookTemplate').remove();
          callback(null, $.html());
        }
      } else {
        //$('.navBar').remove();
        $('.hooks').remove();
        $('.searchServices').remove()
        callback(null, $.html());
      }
    });
  }
};