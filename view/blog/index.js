var df = require('dateformat');

module['exports'] = function view (opts, callback) {
  
  var self = this, $ = this.$;
  
  
  // TODO: multiple posts
  var post = self.parent['the-monolith-versus-the-microservice-a-tale-of-two-applications'];
  var getData = new Function(post.$('.data').html() + ' return data;');
  var data = getData();

  $('.posts').append('<li>' + df(new Date(data.date), "mm/dd") + ' - <a href="' + data.url + '">' + data.title + '</a></li>');

  callback(null, $.html());
};

// cache this page to only reload every 60 seconds
// module['exports'].cache = 60000; // TODO: make longer