var hook = require('../lib/resources/hook');
var cache = require('../lib/resources/cache');
var metric = require('../lib/resources/metric');
var request = require('hyperquest');
var dateFormat = require('dateformat');
var forms = require('mschema-forms');
var mustache = require('mustache');
var mergeParams = require('merge-params');
var bodyParser = require('body-parser');
var themes = require('../lib/resources/themes');
var server = require('../lib/server');


function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module['exports'] = function view (opts, callback) {
  var req = opts.request,
      res = opts.response
      result = opts;

  var self = this, $ = self.$;

  var params;

  if (!req.isAuthenticated()) {
    req.session.redirectTo = req.url;
    return res.redirect('/login');
  }
  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});
    params = opts.request.resource.params;

    if (typeof params.owner === 'undefined') {
      // redirect to hook listing page
      return res.redirect('/' + req.session.user);
    }

    if (req.session.user !== params.owner && req.session.user !== "Marak") {
      return res.end(req.session.user + ' does not have permission to manage ' + params.owner + "/" + params.name);
    }
  
    var name;
    if (typeof params.previousName !== 'undefined') {
      name = params.previousName;
    } else {
      name = params.name;
    }
    // fetch the latest version of hook ( non-cached )
    hook.find({ owner: params.owner, name: name }, function (err, result) {
      if (err) {
        return res.end(err.message);
      }
      if (result.length === 0) {
        return server.handle404(req, res);
      }
      req.hook = result[0];
      presentView();
    });
  });

  function presentView () {

    if (params.save) {
      // update the hook
      // at this point, auth should have already taken place, so we can just call Hook.save

      // manually assign properties
      var data = {};

      // strings
      data.gist = params.hookSource || req.hook.gist;
      data.name = params.name;
      data.path = params.path;

      data.theme = params.theme;
      data.presenter = params.presenter;
      data.mode = params.mode;

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

      return hook.update(data, function(err, result){
        if (err) {
          // TODO: generic error handler
          return res.end(err.message);
        }
        cache.set(key, result, function(){
          $('.formStatus').html('Saved!');
          finish(result);
        });
      });
    } else {
      // get latest metric
      metric.get('/' + req.hook.owner + "/" + req.hook.name + "/hits", function (err, count){
        req.hook.ran = count || 0;
        finish(req.hook);
      });
    }

    function finish (h) {

      $('.hookLink').attr('href', '/' + h.owner + '/' + h.name);
      $('.hookRefresh').attr('href', '/' + h.owner + '/' + h.name + '/refresh');

      $('.hookRan').attr('value', numberWithCommas(h.ran));
      $('.name').attr('value', h.name);
      $('.owner').attr('value', h.owner);
      $('.path').attr('value', h.path);
      $('.previousName').attr('value', h.name);

      $('.hookSource').attr('value', h.gist);

      if (h.cronActive === true) {
        $('.cronActive').attr('checked', 'CHECKED');
      }

      if (typeof h.cron !== 'undefined') {
        console.log('h', h.cron)
        $('#cronString').attr('value', h.cron);
      }

      if (h.isPublic === true) {
        $('.isPublic').attr('checked', 'CHECKED');
      }

      if (typeof h.status !== 'undefined') {
        $('.status').prepend('<option value="' + h.status + '">' + h.status + '</option>')
      }

      if (typeof h.mode !== 'undefined') {
        $('.mode').prepend('<option value="' + h.mode + '">' + h.mode + '</option>')
      }

      $('.deleteLink').attr('href', '/' + h.owner + "/" + h.name + "?delete=true");
      $('.deleteLink').attr('data-name', (h.owner + "/" + h.name));

  //    $('form').attr('action', '/admin?owner=' + h.owner + "&name=" + h.name);

      self.parent.components.themeSelector.present({ theme: h.theme, presenter: h.presenter, hook: h, themes: themes }, function(err, html){
        var el = $('.hookTable > div').eq(4);
        el.after(html);
        var out = $.html();
        out = out.replace("{{themes}}", JSON.stringify(themes, true, 2));
        out = out.replace("{{hook.cron}}", h.cron);
        return callback(null, out);
      });

    }

  }

};