var hook = require('../lib/resources/hook');
var cache = require('../lib/resources/cache');
var request = require('hyperquest');
var dateFormat = require('dateformat');
var forms = require('mschema-forms');
var mustache = require('mustache');
var mergeParams = require('./mergeParams');
var bodyParser = require('body-parser');
// var themes = require('../lib/resources/themes');

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module['exports'] = function view (opts, callback) {
  var params = opts.request.resource.params;
  var req = opts.request,
      res = opts.response
      result = opts;

  var self = this, $ = self.$;

  if (!req.isAuthenticated()) {
    req.session.redirectTo = req.url;
    return res.redirect('/login');
  }

  if (typeof params.owner === 'undefined') {
    // redirect to hook listing page
    return res.redirect('/' + req.session.user);
  }

  if (req.session.user !== params.owner && req.session.user !== "Marak") {
    return res.end(req.session.user + ' does not have permission to manage ' + params.owner + "/" + params.name);
  }

  // fetch the hook
  hook.find({ owner: params.owner, name: params.name }, function (err, result) {
    if (err) {
      return res.end(err.message);
    }
    if (result.length === 0) {
      return handle404(req, res);
    }
    req.hook = result[0];
    bodyParser()(req, res, function bodyParsed(){
      mergeParams(req, res, function(){});
      var params = req.resource.params;
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

      data.theme = params.theme;
      data.presenter = params.presenter;
      data.mode = params.mode;

      // TODO: check to see if index.html file matches up with known theme
      data.cron = params.cronString || req.hook.cron;
      data.status = params.status || req.hook.status;

      // booleans
      if(typeof params.cronActive !== 'undefined') {
        data.cronActive = true;
      } else {
        data.cronActive = false;
      }

      if(typeof params.isPublic !== 'undefined') {
        data.isPublic = true;
      } else {
        data.isPublic = false;
      }

      data.id = req.hook.id;

      var key = req.hook.owner + "/" + req.hook.name;

      return hook.update(data, function(err, result){
        if (err) {
          // TODO: generic error handler
          return res.end(err.message);
        }
        cache.set(key, result, function(){
          $('.formStatus').html('Saved!');
          finish();
        });
      });
    }

    finish();

    function finish () {

      $('.hookLink').attr('href', '/' + req.hook.owner + '/' + req.hook.name);

      $('.hookRan').attr('value', numberWithCommas(req.hook.ran));
      $('.hookName').attr('value', req.hook.name);

      $('.hookSource').attr('value', req.hook.gist);

      if (req.hook.cronActive === true) {
        $('.cronActive').attr('checked', 'CHECKED');
      }

      if (typeof req.hook.cron !== 'undefined') {
        $('#cronString').attr('value', req.hook.cron);
      }

      if (req.hook.isPublic === true) {
        $('.isPublic').attr('checked', 'CHECKED');
      }

      if (typeof req.hook.status !== 'undefined') {
        $('.status').prepend('<option value="' + req.hook.status + '">' + req.hook.status + '</option>')
      }

      if (typeof req.hook.mode !== 'undefined') {
        $('.mode').prepend('<option value="' + req.hook.mode + '">' + req.hook.mode + '</option>')
      }

      $('.deleteLink').attr('href', '/' + req.hook.owner + "/" + req.hook.name + "?delete=true");
      $('.deleteLink').attr('data-name', (req.hook.owner + "/" + req.hook.name));

      $('form').attr('action', '/admin?owner=' + req.hook.owner + "&name=" + req.hook.name);

      self.parent.components.themeSelector.present({ theme: req.hook.theme, presenter: req.hook.presenter, hook: req.hook }, function(err, html){
        var el = $('.hookTable > div').eq(4);
        el.after(html);
        callback(null, $.html());
      });

      return callback(null, $.html());
    }

  }

};