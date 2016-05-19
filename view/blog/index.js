var df = require('dateformat');
var config = require('../../config');

module['exports'] = function view (opts, callback) {

  var self = this, $ = this.$;

  function appendPost (post) {
    if(post.$) {
      var getData = new Function(post.$('.data').html() + ' return data;');
      var data = getData();
      $('.posts').prepend('<li>' + df(new Date(data.date), "mm/dd") + ' - <a href="' + config.app.url + "/blog/" +post.name + '">' + data.title + '</a></li>');
    } else {
      console.log('not available', post.name)
    }
  };

  var posts = [
    'the-monolith-versus-the-microservice-a-tale-of-two-applications',
    'new-multi-language-support',
    'hook-in-your-language',
    'role-based-access-control',
    'websocket-hooks',
    "multi-cloud-virtual-file-system"
  ];

  posts.forEach(function(p){
    var post = self.parent[p];
    appendPost(post);
  });

  callback(null, $.html());
};

// cache this page indefintely
module['exports'].cache = 0;