var hook = require('../../lib/resources/hook');
var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var config = require('../../config');

module['exports'] = function view (opts, callback) {
  var req = opts.req, res = opts.res, $ = this.$;
  var appName = req.hostname;

  $ = req.white($);

  var params = req.resource.params;

  if (req.user && req.session.user) {
    $('.loggedOut').remove();
  }

  return hook.find({owner: req.params.owner, name: req.params.hook }, function (err, result) {
    if (err) {
      return res.end(err.message);
    }

    if (result.length === 0) {
      return res.end('Not found');
    }

    var h = result[0];
    req.resource.owner = req.params.owner;
    checkRoleAccess({ req: req, res: res, role: "hook::source::read" }, function (err, hasPermission) {

      // only protect source of private services
      if (h.isPrivate !== true) {
        hasPermission = true;
      }

      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, "hook::source::read"));
      }
      next();
    });

    function next () {

        // note: we could be using the new pkg format
        var extentions = {
          ".js": "javascript",
          ".coffee": "coffee-script",
          ".lua": "lua",
          ".php": "php",
          ".pl": "perl",
          ".py": "python", // Remark: You can also use the "--language python" option
          ".py3": "python3", // Remark: You can also use the "--language python3" option
          ".sh": "bash",
          ".rb": "ruby",
          ".tcl": "tcl",
          ".ss": "scheme",
          ".st": "smalltalk"
        };
        var file = "index";
        Object.keys(extentions).forEach(function(ext){
          if (extentions[ext] === h.language) {
            file += ext;
          }
        });


        $('.service').html(file);
        $('.service').attr('href', '?f=' + file);
        $('#forkLink').attr('href', '/' + h.owner + '/' + h.name + '/fork');

        if (typeof h.themeSource === "undefined" || h.themeSource.length === 0) {
          $('.view').parent().remove();
        }

        if (typeof h.presenterSource === "undefined" || h.presenterSource.length === 0) {
          $('.presenter').parent().remove();
        }

        if (typeof h.mschema === "undefined") {
          $('.schema').parent().remove();
        }

        /*
        h.themeSource
        h.presenterSource
        h.mschema
        $('.service').html();
        $('.view').html();
        $('.presenter').html();
        $('.schema').html();
        */

        if (typeof h.inputs === "undefined" || h.inputs.length < 0) {
          $('.hooks').remove();
        } else {
          $('.inputs').html(JSON.stringify(h.inputs || []));
        }
        req.hook = h;

        //$('.hookName').html(h.owner + "/" + h.name);
        //$('.hookLink').attr('href', config.app.url + '/' + h.owner + '/' + h.name);
        var hookLink = config.app.url + '/' + h.owner + '/' + h.name;
        $('.hookRun').attr('href', hookLink);
        $('.hookRun').html(hookLink);

        $('.hookAdmin').attr('href', config.app.url + '/' + h.owner + '/' + h.name + '/admin');
        $('.hookAdmin').html(h.owner + '/' + h.name);

        switch (params.f) {

          case 'view.html':
            $('#code').text(h.themeSource);
          break;

          case 'presenter.js':
            $('#code').text(h.presenterSource);
          break;

          case 'schema.js':
            $('#code').text(JSON.stringify(h.mschema, true, 2));
          break;

          default:
            $('#code').text(h.source);
          break;

        }

        $('.currentFile').html(params.f);

        var lang = h.language;
        // since python and python3 are considered the same for rainbow highlighting library
        if (lang === 'python3') {
          lang = 'python';
        }
        $('#code').attr('data-language', lang);

        var out = $.html();
        out = out.replace(/\{\{appName\}\}/g, appName);
        callback(null, out);

    }

  });

};

module['exports'].useParentLayout = false;