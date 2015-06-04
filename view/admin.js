var hook = require('../lib/resources/hook');
var request = require('hyperquest');
var GitHubApi = require('github');
var dateFormat = require('dateformat');
var forms = require('mschema-forms');
var mustache = require('mustache');
var mergeParams = require('./mergeParams');
var bodyParser = require('body-parser');

// load docs html as file
var docs = require('fs').readFileSync('./view/docs.html').toString();

var github = new GitHubApi({
    // required
    version: "3.0.0",
    // optional
    debug: false,
    protocol: "https",
    host: "api.github.com",
    requestFormat: "json",
    timeout: 5000
});

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module['exports'] = function view (opts, callback) {
  var params = opts.request.resource.params;
  var req = opts.request,
      res = opts.response
      result = opts;

  var self = this, $ = self.$;

  console.log(req.session)
  if (!req.isAuthenticated()) {
    req.session.redirectTo = req.url;
    return res.redirect('/login');
  }

  if (typeof params.owner === 'undefined') {
    return res.redirect('/');
  }

  if (req.session.user !== params.owner) {
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
    console.log('xxx', params);
    console.log('yyy', req.hook);
    if (params.save) {
      // update the hook
      // at this point, auth should have already taken place, so we can just call Hook.save

      // manually assign properties
      
      // strings
      req.hook.gist = params.gist || req.hook.gist;
      
      req.hook.theme = params.theme || req.hook.theme;
      req.hook.presenter = params.presenter || req.hook.presenter;
      req.hook.cron = params.cronString || req.hook.cron;
      req.hook.status = params.status || req.hook.status;

      // booleans
      if(typeof params.cronActive !== 'undefined') {
        req.hook.cronActive = true;
      } else {
        req.hook.cronActive = false;
      }

      if(typeof params.isPublic !== 'undefined') {
        req.hook.isPublic = true;
      } else {
        req.hook.isPublic = false;
      }

      
      console.log('sss', req.hook);
      
      return req.hook.save(function(err, result){
        if (err) {
          // TODO: generic error handler
          return res.end(err.message);
        }
        finish()
      });
    }
    
    finish();
    
    function finish () {
      
      $('.hookRan').html(numberWithCommas(req.hook.ran));
      $('.hookName').attr('value', req.hook.name);

      $('.hookSource').attr('value', req.hook.gist);

      if (req.hook.cronActive === true) {
        $('.cronActive').attr('checked', 'CHECKED');
      }

      // TODO:
      if (typeof req.hook.cron !== 'undefined') {
        $('#cronString').attr('value', req.hook.cron);
      }

      if (req.hook.isPublic === true) {
        $('.isPublic').attr('checked', 'CHECKED');
      }
      
      if (typeof req.hook.status !== 'undefined') {
        $('.status').prepend('<option value="' + req.hook.status + '">' + req.hook.status + '</option>')
      }

      $('.deleteLink').attr('href', '/' + req.hook.owner + "/" + req.hook.name + "?delete=true");
      $('.deleteLink').attr('data-name',  + req.hook.owner + "/" + req.hook.name);

      $('form').attr('action', '/admin?owner=' + req.hook.owner + "&name=" + req.hook.name);

      self.parent.components.themeSelector.present({ theme: req.hook.theme, presenter: req.hook.presenter }, function(err, html){
        var el = $('.table-condensed > tr').eq(1);
        el.after(html);
        callback(null, $.html());
      })


      return callback(null, $.html());    
    }

  }

};