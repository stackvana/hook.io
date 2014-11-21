var hook = require('../lib/resources/hook');
var mergeParams = require('./mergeParams');
var bodyParser = require('body-parser');

/*
var themes = {
  "debug": {
    "theme": config.defaultTheme,
    "presenter": config.defaultPresenter
  },
  "simple": {
    "theme": "http://hook.io/themes/simple/index.html",
    "presenter": "http://hook.io/themes/simple/index.js"
  },
  "simple-form": {
    "theme": "http://hook.io/themes/simple-form/index.html",
    "presenter": "http://hook.io/themes/simple-form/index.js"
  },
};
*/

module['exports'] = function doc (opts, callback) {
  var $ = this.$, self = this;

  var req = opts.request, res = opts.response, params = req.resource.params;
  //console.log('got params', params)
  $('.hookLink').html('<a href="http://hook.io/' + params.hook + '">' + params.hook + '</a>')
  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});
    if (typeof params.hook === "undefined" || params.hook.length === 0) {
      return res.end('hook not specified');
    }

    // check if user is logged in
    if (!req.isAuthenticated()) { 
      req.session.redirectTo = "/edit?hook=" + params.hook;
      return res.redirect('/login');
    }

    var parts = params.hook.split('/');

    if(req.user.username !== parts[0] && req.user.username !== "Marak") {
      return res.end('No permission to edit this Hook.')
    }

    $('form').attr('action', '/edit?hook=' + params.hook);

    var query = { owner: parts[0], name: parts[1] };
    return hook.find(query, function(err, results){
      if (err) {
        return res.end(err.stack);
      }
      if (results.length === 0) {
        return res.end('Hook not found!');
      }

      var h = results[0];
      // console.log("FOUND", h)
      // if params.update, update the hook
      if (params.update) {
        // don't allow users to overwrite hooks
        if (h.name !== params.name) {
          var query = { owner: h.owner, name: params.name };
          hook.find(query, function(err, _results){
            if (err) {
              return res.end(err.stack);
            }
            if (_results.length === 0) {
              updateHook();
            } else {
              return res.end('Unable to rename ' + h.name + ' to ' + params.name + ' since ' + h.name + ' already exists!');
            }
          });
        } else {
          updateHook();
        }
        
        function updateHook () {
          h.name = params.name;
          h.gist = params.gist;
          // TODO: move this to mergeParams
          if (params.cronActive === "on") {
            h.cronActive = true;
          } else {
            h.cronActive = false;
          }
          h.cron = params.cronString;
          h.theme = params.theme;
          h.presenter = params.presenter;
          return h.save(function(err){
            if (err) {
              return res.end(err.stack);
            }
            // redirect to hook edit page ( as hook name might have changed)
            return res.redirect(301, '/edit?hook=' + h.owner + "/" + h.name);
          });
        }

      } else {
        renderForm();
      }

      function renderForm () {
        $('form input[name="name"]').attr('value', h.name);
        $('form input[name="gist"]').attr('value', h.gist);
        $('form select[name="theme"] option[value="' + "simple" + '"]').attr('selected', 'selected');
        if (h.cronActive !== false) {
          $('form input[name="cronActive"]').attr('checked', 'checked');
          $('.cronRow').attr('showMe', 'true');
        }
        $('.cronRow').attr('cronString', h.cron);
        $('form input[name="cronString"]').attr('value', h.cron);
        // load information about the hook
        // bind hook data to form
        
        self.parent.components.themeSelector.present({}, function(err, html){
          var el = $('.table-condensed > tr').eq(1);
          console.log(el)
          el.after(html);
          return callback(null, $.html());
        })
        
      }

    });
  });

};