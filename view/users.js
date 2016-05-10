var user = require('../lib/resources/user');

module['exports'] = function view (opts, callback) {

  var $ = this.$;

  var req = opts.request,
      res = opts.response,
      params = req.resource.params;

  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  if (req.session.user.toLowerCase() !== "marak") {
    return res.redirect('/' + req.session.user);
  }

  user.all({}, function(err, users){
  
    users = users.sort(function(a, b){
      console.log(a, b)
      if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1;
      }
      if (a.name.toLowerCase() < b.name.toLowerCase()) {
        return -1;
      }
      return 0;
    });
    for(var h in users) {
      $('.hooks').append('<tr><td><a href="{{appUrl}}/' + users[h].name + '">' + users[h].name + '</a></td><td>' + users[h].email + '</td></tr>')
    }

    callback(null, $.html());
    
  })
};