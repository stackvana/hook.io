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

  function addItem (post) {
    var getData = new Function(post.$('.data').html() + ' return data;');
    var data = getData();
    feed.item(data);
  };

  var posts = [
    'the-monolith-versus-the-microservice-a-tale-of-two-applications',
    'new-multi-language-support',
    'hook-in-your-language',
    'role-based-access-control',
    'websocket-hooks',
    'multi-cloud-virtual-file-system'
  ];

  posts.forEach(function(p){
    var post = self.parent[p];
    addItem(post);
  });

  var xml = feed.xml();
  callback(null, xml);
};

// cache this page indefintely
module['exports'].cache = 0;