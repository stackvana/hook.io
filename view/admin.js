// Make run count live

var hook = require('../lib/resources/hook');
var user = require('../lib/resources/user');
var resource = require('resource');
var hooks = require('hook.io-hooks');
var cache = require('../lib/resources/cache');
var billing = require('../lib/resources/billing');
var metric = require('../lib/resources/metric');
var request = require('hyperquest');
var dateFormat = require('dateformat');
var forms = require('mschema-forms');
var mustache = require('mustache');
var mergeParams = require('merge-params');
var bodyParser = require('body-parser');
var themes = require('../lib/resources/themes');
var web = require('../lib/web');
var languages = require('../lib/resources/programmingLanguage').languages;
var checkRoleAccess = require('../lib/server/routeHandlers/checkRoleAccess');
var config = require('../config');

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module['exports'] = function view (opts, callback) {
  var req = opts.request,
      res = opts.response
      result = opts;

  var self = this, $ = self.$;

  var params;

  /* Remark: Removed in favor or role check
  if (!req.isAuthenticated()) {
    req.session.redirectTo = req.url;
    return res.redirect('/login');
  }
  */

  $ = req.white($);

  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});
    params = opts.request.resource.params;

    // params.owner = req.session.user;

    checkRoleAccess({ req: req, res: res, role: "hook::update" }, function (err, hasPermission) {
      // console.log('check for role access', err, hasPermission)
      if (!hasPermission || req.resource.owner === "anonymous") { // don't allow anonymous hook update
        if (req.jsonResponse !== true && typeof params.hook_private_key === "undefined") {
          req.session.redirectTo = req.url;
          return res.redirect('/login');
        }
        return res.end(config.messages.unauthorizedRoleAccess(req, "hook::update"));
      } else {
        user = req.resource.owner;
        boot = {
          owner: user
        };
        params.owner = user;
        next();
      }
    });

    function next () {

      if (typeof params.owner === 'undefined' || params.owner.length === 0) {
        return res.redirect(301, '/' + req.session.user);
      }

      var name;
      if (typeof params.previousName !== 'undefined') {
        name = params.previousName;
      } else {
        name = params.name;
      }

      if (typeof name === 'undefined' || name.length === 0) {
        return res.redirect(301, '/' + req.session.user);
      }

      /*
      if (req.session.user !== params.owner && req.session.user !== "marak") {
        return res.end(req.session.user + ' does not have permission to manage ' + params.owner + "/" + params.name);
      }
      */

      // console.log('finding', { owner: params.owner, name: name });
      // fetch the latest version of hook ( non-cached )
      hook.find({ owner: params.owner, name: name }, function (err, result) {
        if (err) {
          return res.end(err.message);
        }
        if (result.length === 0) {
          return web.handle404(req, res);
        }
        req.hook = result[0];
          billing.find({ owner: req.session.user }, function (err, results) {
            if (err) {
              return callback(err, $.html());
            }
            if (results.length > 0) {
              // TODO: better billings check
              req.billings = results[0];
            }
            presentView();
          });
      });
    }

  });

  function presentView () {

    if (params.save || req.method === "POST") {
      // update the hook
      // at this point, auth should have already taken place, so we can just call Hook.save

      // manually assign properties
      var data = {};
      // strings
      data.gist = params.gist;
      data.language = params.language;

      if (params.hookSource === "code") {
        delete params.gist;
        params.source = params.codeEditor;
      } else if (params.hookSource === "gist") {
        delete params.source;
      }

      data.sourceType = params.hookSource;
      data.source = params.source;
      data.name = params.name;
      data.path = params.path;

      if (params.isPrivate === "true") {
        data.isPrivate = true;
      } else {
        data.isPrivate = false;
      }

      // make more API friendly
      if (params.themeActive) {
        data.themeStatus = "enabled";
      } else {
        data.themeStatus = "disabled";
      }

      if (params.schemaActive) {
        data.mschema = JSON.parse(params.schema);
        data.mschemaStatus = "enabled";
      } else {
        data.mschemaStatus = "disabled";
      }

      // TODO: also add view as new property name for public API
      if (params.themeActive) {
        data.themeStatus = "enabled";
        data.themeSource = params.themeSource;
        data.presenterSource = params.presenterSource;
      }

      data.themeName = params.themeSelect;
      data.theme = params.theme;
      data.presenter = params.presenter;
      data.mode = params.mode;

      // todo: only available for paid accounts
      if ((req.user && req.user.paidStatus === "paid") || req.session.paidStatus === "paid") {
        data.customTimeout = params.customTimeout || 10000;
      }

      // TODO: check to see if index.html file matches up with known theme
      data.cron = params.cronString || req.hook.cron;
      data.status = params.status || req.hook.status;

      // booleans
      if (typeof params.cronActive !== 'undefined') {
        data.cronActive = true;
      } else {
        data.cronActive = false;
      }

      if (typeof params.isPublic !== 'undefined') {
        data.isPublic = true;
      } else {
        data.isPublic = false;
      }

      data.id = req.hook.id;
      var key = '/hook/' + req.hook.owner + "/" + data.name;
      data.owner = req.hook.owner;

      if (typeof data.language === "undefined") {
        delete data.language;
      }

      return hook.update(data, function(err, result){
        if (err) {
          // TODO: generic error handler
          return res.end(err.message);
        }

        resource.emit('hook::updated', {
          ip: req.connection.remoteAddress,
          owner: req.hook.owner,
          name: data.name
        });

        cache.set(key, result, function(){
          if (req.jsonResponse) {
            var rsp = {
              "status": "updated",
              "key": key,
              "value": result
            };
            return res.json(rsp)
          }
          return res.redirect('/admin?owner=' + req.hook.owner + "&name=" + data.name + "&status=saved");
        });
      });

    } else {

      var owner = req.hook.owner,
          service = req.hook.name;
      var getMetrics = [
        '/' + owner + "/hits",
        '/' + owner + "/totalHits",
        '/' + owner + "/gateway/hits",
        '/' + owner + "/running",
        '/' + owner + "/" + service + "/hits",
        '/' + owner + "/" + service + "/running"
      ];
      // get latest metrics
      metric.all(req.hook.owner, req.hook.name, function (err, _metrics) {
        req.hook.metrics = _metrics;

        // filter out some metrics we don't want to show
        // TODO: metric.mget method
        Object.keys(_metrics).forEach(function(k){
          var str = '<tr class="metricRow">\
            <td class="metric"><a href="' + config.app.url + '/metrics' + k + '">/metrics' + k + '</a></td>\
            <td class="count">' +  numberWithCommas(_metrics[k] || 0) + '</td>\
          </tr>';
          $('.hookMetrics table').append(str);
        });
        metric.get('/' + req.hook.owner + "/" + req.hook.name + "/hits", function (err, count){
          req.hook.ran = count || 0;
          finish(req.hook);
        });
      });
    }

    function finish (h) {

      var services = hook.services;
      if (req.jsonResponse) {
        return res.json("OK")
      }

      if (req.user.paidStatus === "paid" || req.session.paidStatus === "paid") {
        $('.paidAccount').remove();
      } else {
        $('.securityHolder input').attr('disabled', 'DISABLED')
        $('.securityHints').remove();
      }

      for (var s in services) {
        $('.services').append(services[s]);
      }

      if (params.status === "forked") {
        $('.message').html('Hook Forked!')
      }

      if (params.status === "refreshed") {
        $('.message').html('Refreshed any cached sources.')
      }

      if (params.status === "created") {
        $('.message').html('Hook Created!')
      }

      if (params.status === "saved") {
        $('.message').html('Hook Saved!')
      }

      $('#owner').attr('value', h.owner);

      $('.hookLink').attr('href', '/' + h.owner + '/' + h.name);
      $('.hookLogs').attr('href', '/' + h.owner + '/' + h.name + "/logs");
      $('.clearLogs').attr('href', '/' + h.owner + '/' + h.name + "/logs?flush=true");
      $('.hookSource').attr('href', '/' + h.owner + '/' + h.name + "/_src");
      $('.hookResource').attr('href', '/' + h.owner + '/' + h.name + "/resource");
      $('.hookView').attr('href', '/' + h.owner + '/' + h.name + "/view");
      $('.hookPresenter').attr('href', '/' + h.owner + '/' + h.name + "/presenter");
      $('.hookRefresh').attr('href', '/' + h.owner + '/' + h.name + '/refresh');
      $('.hookRevisions').attr('href', '/' + h.owner + '/' + h.name + '/_rev');
      $('.hookAdmin').attr('href', '/' + h.owner + '/' + h.name + '/admin');
      $('.hookRun').attr('href', '/' + h.owner + '/' + h.name);
      $('#themeSource').html(h.themeSource);
      $('#presenterSource').html(h.presenterSource);

      if (typeof h.mschema !== "undefined") {
        $('.hookSchema').html(JSON.stringify(h.mschema, true, 2));
      }
      if (typeof h.customTimeout === "number") {
        $('.customTimeout').attr('value', h.customTimeout.toString());
      }

      if (req.user.paidStatus === "paid" || req.session.paidStatus === "paid") {
        //
      } else {
        $('.customTimeout').attr('disabled', 'DISABLED');
      }

      $('#name').attr('value', h.name);
      $('.owner').attr('value', h.owner);
      if (h.isPrivate) {
        $('.hookPrivate').attr('checked', 'CHECKED');
      } else {
        $('.hookPublic').attr('checked', 'CHECKED');
      }
      $('#path').attr('value', h.path);
      $('.previousName').attr('value', h.name);

      $('.hookSource').attr('value', h.gist);

      if (h.sourceType === "gist") {
        $('#gist').attr('value', h.gist);
        $('#gistSource').attr('checked', 'CHECKED');
      } else {
        $('#editorSource').attr('checked', 'CHECKED');
        $('.gistUrlHolder').attr('style', 'display:none;');
        $('.codeEditorHolder').attr('style', 'display:block;');
      }
      /*
      if (h.gist && h.gist.length > 5) {
        // do nothing
      } else {
      }
      */

      if (h.cronActive === true) {
        $('.cronActive').attr('checked', 'CHECKED');
      }

      if (typeof h.cron !== 'undefined') {
        $//('#cronString').attr('value', h.cron);
      }

      $('.isPublic').attr('checked', 'CHECKED');
      $('.isPublic').attr('DISABLED', 'DISABLED');
      $('.isPublic').attr('title', 'Private Hooks require a paid account.');
      
      if (h.isPublic === true) {
        $('.isPublic').attr('checked', 'CHECKED');
      }

      if (typeof h.language !== 'undefined') {
        $('#language').prepend('<option value="' + h.language + '">' + h.language + '</option>')
        $('#gatewayLang').attr('value', h.language);
        $('#gatewayForm').attr('action', '/gateway');
      }

      if (typeof h.status !== 'undefined') {
        $('.status').prepend('<option value="' + h.status + '">' + h.status + '</option>')
      }

      if (typeof h.mode !== 'undefined') {
        $('.mode').prepend('<option value="' + h.mode + '">' + h.mode + '</option>')
      }

      $('.deleteLink').attr('href', '/' + h.owner + "/" + h.name + "/delete");
      $('.deleteLink').attr('data-name', (h.owner + "/" + h.name));

      self.parent.components.themeSelector.present({ 
        request: req,
        response: res,
        theme: h.theme, presenter: h.presenter, hook: h, themes: themes }, function(err, html){
        var el = $('.themeSelector')
        el.html(html);

        $('#theme').attr('value', h.theme);
        $('#presenter').attr('value', h.presenter);
        if (typeof h.themeName !== 'undefined' && h.themeName.length > 0) {
          $('.themeSelect').prepend('<option>' + h.themeName + '</option>')
        }

        if (h.themeStatus === "enabled") {
          $('#themeActive').attr('checked', 'CHECKED');
          $('.themeRow').attr('style', 'display: block;');
        }

        if (h.mschemaStatus === "enabled") {
          $('#schemaActive').attr('checked', 'CHECKED');
          $('.schemaRow').attr('style', 'display: block;');
        }

        var i18n = require('./helpers/i18n');
        var i = req.i18n;
        i18n(i, $);

        var out = $.html();
        h.cron = h.cron || "* * * * *";
        out = out.replace("{{themes}}", JSON.stringify(themes, true, 2));
        out = out.replace("{{hook.cron}}", h.cron);
        var boot = {
          owner: req.session.user,
          source: h.source,
          presenter: escape(h.presenterSource),
          view: escape(h.themeSource),
          themes: themes,
          cron: h.cron
        };

        var services = hooks.services;
        var examples = {};
        // pull out helloworld examples for every langauge
        hook.languages.forEach(function(l){
          examples[l] = services['examples-' + l + '-hello-world'];
        });

        for (var s in services) {
          var e = services[s];
          var type = s.split('-')[0],
              lang = s.split('-')[1];
          if (type === "examples" && lang === "javascript") {
            $('.selectSnippet').prepend('<option value="' + 'marak/' + s + '">' + e.description + '</option>')
          }
        }

        boot.examples = examples;
        out = out.replace('{{hook}}', JSON.stringify(boot, true, 2));
        out = out.replace(/\{\{appAdminEmail\}\}/g, config.app.adminEmail);
        return callback(null, out);
      });

    }

  }

};