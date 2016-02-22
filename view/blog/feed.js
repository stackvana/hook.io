var RSS = require('rss');

module['exports'] = function view (opts, callback) {

  var self = this;

  var feedOptions = {
      title: 'all things microservice, the hook.io microservice blog',
      description: 'a blog about everything microservice related, maintained by the hook.io hosting platform',
      feed_url: 'https://hook.io/blog/feed',
      site_url: 'https://hook.io',
      managingEditor: 'hook.io',
      webMaster: 'hook.io',
      copyright: '2016 hook.io',
      language: 'en',
      pubDate: 'Jul 29, 2015 15:38:30 PDT'
    };

  var feed = new RSS(feedOptions);

  // TODO: multiple posts

  var post3 = self.parent['hook-in-your-language'];
  var getData = new Function(post3.$('.data').html() + ' return data;');
  var data = getData();
  feed.item(data);

  var post2 = self.parent['new-multi-language-support'];
  var getData = new Function(post2.$('.data').html() + ' return data;');
  var data = getData();
  feed.item(data);

  var post = self.parent['the-monolith-versus-the-microservice-a-tale-of-two-applications'];
  var getData = new Function(post.$('.data').html() + ' return data;');
  var data = getData();
  feed.item(data);

  var post = self.parent['role-based-access-control'];
  var getData = new Function(post.$('.data').html() + ' return data;');
  var data = getData();
  feed.item(data);


  var xml = feed.xml();
  callback(null, xml);
};

// cache this page indefintely
module['exports'].cache = 0;