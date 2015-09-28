var big = require('big');
var view = require('view');
module['exports'] = function view (opts, callback) {

  var $ = this.$;

  var req = opts.request,
      res = opts.response,
      params = req.resource.params;

  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  // TODO: add roles and groups
  if (req.session.user.toLowerCase() !== "marak") {
    return res.redirect('/' + req.session.user);
  }

 function loadPresenter (code, callback) {
    var _presenter, 
        err = null;
    // try to compile the hot-code into a module
    var id = new Date().getTime();
    try {
      var Module = module.constructor;
      var m = new Module();
      var name = 'presenterCode-' + id;
      delete require.cache[name];
      m.paths = module.paths;
      m._compile(code, name);
    } catch (err) {
      // console.log('err', err)
      return res.end(err.message);
    }
    return m.exports;
  };

  var views = big.server.app.view;

  if (params.refreshView) {

    // TODO: nested / multilevel views
    var fs = require('fs');
    var v, t, p;

    return fs.readFile(__dirname + "/" + params.refreshView + ".html", function (err, _t) {

      if (err) {
        return res.end(err.message);
      }

      t = _t.toString();
      fs.readFile(__dirname + "/" + params.refreshView + ".js", function (err, _p) {

        if (err) {
          // dont do anything, just ignore presenter because it doesnt exist
          //return res.end(err.message);
        } else {
          p = _p.toString();
        }

        var paths = params.refreshView.split('/');

        // TODO: multiple nested levels
        if (paths.length === 1) {
          v = views[paths[0]];
        } else {
          v = views[paths[0]].views[paths[1]];
        }

        v.template = _t;
        if (p) {
          v.presenter = loadPresenter(p);
        }

        return res.end('attempting to refresh ' + params.refreshView);

      })

    })
  }

  /*
  
    Render Views Table representing all views on site
  
  */
  var link = function (v) {
    return '<a href="' + v + '">' + v + '</a>';
  };
  Object.keys(views).forEach(function(k){
    if (typeof views[k] !== "object") {
      return;
    }
    $('.table').append('<tr><td><a href="/_admin?refreshView=' + k + '">Reload</a></td><td>' + link('/' + k) + '</td></tr>');
    var sub = views[k].views;
    if (typeof sub === "object") {
      Object.keys(sub).forEach(function(s){
        $('.table').append('<tr><td><a href="/_admin?refreshView=' + k + "/" + s + '">Reload</a></td><td>' + link('/' + k + "/" + s) + '</td></tr>');
      });
    }
  });
  return callback(null, $.html());


};