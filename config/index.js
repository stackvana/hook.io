module['exports'] = {
  site: {
    port: 9999,
    https: true,
    roots: ["127.0.0.1", "localhost", "hook.io", "www.hook.io"]
  },
  baseUrl: "https://localhost",
  couch: {
    "database": "hook",
    "type": "couchdb",
    "username": "admin",
    "password": "password",
    "port": 5984,
    "host": "localhost"
  },
  github: {
    accessName: "",
    accessToken: "",
    // working github tokens are given
    // these are dedicated for hook.io testing
    // don't use these in production as they may be revoked and refeshed at anytime
    CLIENT_ID: "321de11108ccdacf2279",
    CLIENT_SECRET: "14ed41431983aaceef121d32f2f3f3087e0434ac",
    OAUTH_CALLBACK: "http://localhost:9999/login/github/callback"
  },
  defaultTheme : "https://localhost/themes/none/index.html",
  defaultPresenter : "https://localhost/themes/none/index.js",
  stripe: {
    secretKey: "sk_test_ZXdJj4I3Db2iB9ZRm0gqyzDV",
    publicKey: "pk_test_axAR0vF3Qam8zs09JE7t8ZIo"
  },
  email: {
    "provider": "mock",
    "api_user": "marak",
    "api_key": "abcd"
  },
  // tempDirectory: __dirname + "/../temp/",
  tempDirectory: "/hook-temp/",
  sslKeyDirectory: __dirname + '/../ssl/',
  chrootDirectory: '/chroot',
  useChroot: true,
  customDomains: true,
  UNTRUSTED_HOOK_TIMEOUT: 10000,
  messages: {
    childProcessSpawnError: require('./messages/childProcessSpawnError'),
    serviceExecutionTimeout: require('./messages/serviceExecutionTimeout')
  }
};
