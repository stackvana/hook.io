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
      copyright: '2015 hook.io',
      language: 'en',
      pubDate: 'Jul 29, 2015 15:38:30 PDT'
    };

  var feed = new RSS(feedOptions);

  var post = self.parent['the-monolith-versus-the-microservice-a-tale-of-two-applications'];
  var getData = new Function(post.$('.data').html() + ' return data;');
  var data = getData();
  
  feed.item(data);

  var xml = feed.xml();
  console.log(xml)
  callback(null, xml);
};

// cache this page indefintely
module['exports'].cache = 0;