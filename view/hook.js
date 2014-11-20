var hook = require('../lib/resources/hook');
var request = require('hyperquest');
var dateFormat = require('dateformat');
var forms = require('mschema-forms');
var mustache = require('mustache');
var View = require('view').View;

var config = require('../config');

module['exports'] = function view (opts, callback) {

  var params = opts.request.resource.params;
  var req = opts.request,
      res = opts.response;
  var $ = this.$;
  var gist = opts.gist || params.gist;

  var run = params.run;

  if (params.run) {
    opts.req = req;
    opts.res = res;
    return hook.runHook(opts
    , function(err, result){
      if (err) {
        return res.end(err.message);
      }
      return callback(null, result.output);
    });

  }

  // not forking the hook, not running the hook, we need to present it
  var theme, presenter;

  if (typeof req.hook.theme === "undefined" || req.hook.theme.length === 0) {
    // no theme HTML
    theme = config.defaultTheme;
  } else {
    theme = req.hook.theme;
  }

  if (typeof req.hook.presenter === "undefined" || req.hook.presenter.length === 0) {
    // no theme Presenter
    if (theme === config.defaultTheme) {
      presenter = config.defaultPresenter;
    } else {
      presenter = "http://hook.io/themes/simple/index.js";
      
    }
  } else {
    presenter = req.hook.presenter;
  }

  // if a theme was set ( not the default debug theme, and no presenter was given, use simple.js )
  hook.fetchHookTheme(theme, function(err, _theme){
    if (err) {
      return res.end('Unable to fetch theme: ' + theme  + ' ' + err.message);
    }
    hook.fetchHookPresenter(presenter, function(err, _presenter){
      if (err) {
        return res.end(hook.formatError(err));
      }

      var _view = new View({ template: _theme.toString(), presenter: _presenter });

      // give the presenter 3 seconds to render, or else it has failed
      var completedTimer = setTimeout(function(){
        if (!completed) {
          return callback(new Error('Hook presenter took more than 3 seconds to load. Aborting request. \n\nA delay of this long usually means the presenter never fired it\'s callback. Check the presenter code for error. \n\nIf this is not the case and you require more than 3 seconds to present your view, please contact hookmaster@hook.io'));
        }
      }, 3000);

      var completed = false;
      completedTimer = clearTimeout(completedTimer);
      try { // this will catch user run-time errors in the presenter
        _view.present({
          request: req,
          response: res,
          gist: req.hook.gist
        }, function(err, rendered){
          return callback(null, rendered);
        });
      } catch (err) {
        return res.end(err.stack);
      }

    });
  });

};