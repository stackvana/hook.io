var df = require('dateformat');

module['exports'] = function view (opts, callback) {
  
  var self = this, $ = this.$;
  
  
  // TODO: multiple posts
  var post = self.parent['the-monolith-versus-the-microservice-a-tale-of-two-applications'];
  var getData = new Function(post.$('.data').html() + ' return data;');
  var data = getData();
  $('.posts').prepend('<li>' + df(new Date(data.date), "mm/dd") + ' - <a href="' + data.url + '">' + data.title + '</a></li>');

  var post2 = self.parent['new-multi-language-support'];
  var getData = new Function(post2.$('.data').html() + ' return data;');
  var data = getData();
  $('.posts').prepend('<li>' + df(new Date(data.date), "mm/dd") + ' - <a href="' + data.url + '">' + data.title + '</a></li>');

  callback(null, $.html());
};

// cache this page indefintely
module['exports'].cache = 0;