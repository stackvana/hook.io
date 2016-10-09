var hook = require('../lib/resources/hook')

module['exports'] = function view (opts, callback) {

  var $ = this.$;

  var req = opts.request,
      res = opts.response,
      params = req.resource.params;

  return res.end("Not implemented");

  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  if (req.session.user.toLowerCase() !== "marak") {
    return res.redirect('/' + req.session.user);
  }

  if (!opts.request.isAuthenticated()) { 
    $('.manageEnv').remove()
    $('.referrals').remove()
  }


  hook.all(function(err, hooks){
    console.log(err, hooks)
    opts.hooks = hooks;
    opts.hooks = opts.hooks.sort(function(a, b){
      console.log(a, b)
      if (a.owner.toLowerCase() > b.owner.toLowerCase()) {
        return 1;
      }
      if (a.owner.toLowerCase() < b.owner.toLowerCase()) {
        return -1;
      }
      return 0;
    });
    for(var h in opts.hooks) {
      $('.hooks').append('<tr><td><a href="{{appUrl}}/' + opts.hooks[h].owner + "/" + opts.hooks[h].name + '">' + opts.hooks[h].owner + "/" + opts.hooks[h].name + '</a></td></tr>')
    }

    if (Object.keys(opts.hooks).length > 0) {
      $('.noHooks').remove();
    }

    callback(null, $.html());
    
  })
};