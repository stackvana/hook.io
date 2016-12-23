var hook = require('../../lib/resources/hook');
var config = require('../../config');
var request = require('request');
var df = require('dateformat');

module['exports'] = function _revPresenter (opts, callback) {
  var $ = this.$,
  req = opts.req,
  res = opts.res;

  hook.findOne({ name: req.params.hook, owner: req.params.owner }, function(err, _u) {
    if (err) {
      return res.end(err.message);
    }
    var nanoConfig = 'http://' + config.couch.username + ":" + config.couch.password + "@" + config.couch.host + ":" + config.couch.port;
    var nano = require('nano')(nanoConfig);
    var HookDB = nano.use('hook');
    HookDB.get(_u.id, {  revs_info: true, include_docs: true } , function (err, _hook) {
      if (err) {
        return res.end(err.message);
      }
      $('.hookName').attr('href', _hook.owner + '/' + _hook.name + '/admin');
      $('.hookName').html( _hook.owner + '/' + _hook.name);

      //console.log('revs found', _hook._revs_info.length)
      var _revs = [];
      _hook._revs_info.forEach(function(r){
        if (r.status === "available") {
          _revs.push(r.rev);
        }
      });
      HookDB.get(_u.id, { revs_info: true, open_revs: JSON.stringify(_revs, true, 2)  } , function (err, docs) {
        if (err) {
          return res.end(err.message);
        }
        docs = docs.reverse();
        //return res.json(docs);
        // show all revs as JSON or HTML list
        if (req.jsonResponse === true) {
          res.json(docs, true, 2);
        } else {
          var str = '';
          docs.forEach(function(rev){
            if (rev.ok) {
              var url = '/' + req.params.owner + '/' + req.params.hook + '?_rev=' + rev.ok._rev;
              $('.table').append('<tr><td>' + df(rev.ok.mtime, "ddd mmm dd yyyy HH:mm:ss") + '</td><td>' + rev.ok.name + '</td><td>' + '<a href="' + url +'">' + rev.ok._rev + '</a>' + '</td></tr>');
              //var url = '/' + req.params.owner + '/' + req.params.hook + '?_rev=' + rev.rev;
              //str += '<a href="' + url +'">' + rev.rev + '</a><br/>'
            }
          })
          callback(null, $.html());
        }
      });
    });
  });

};