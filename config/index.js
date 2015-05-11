module['exports'] = {
  site: {
    port: 9999,
    https: true
  },
  couch: {
    "database": "hook",
    "type": "couchdb",
    "username": "admin",
    "password": "password",
    "port": 5984,
    "host": "localhost"
  },
  github: {
    // working github tokens are given
    // these are dedicated for hook.io testing
    // don't use these in production as they may be revoked and refeshed at anytime
    CLIENT_ID: "321de11108ccdacf2279",
    CLIENT_SECRET: "14ed41431983aaceef121d32f2f3f3087e0434ac",
    OAUTH_CALLBACK: "http://localhost:9999/login/callback"
  },
  defaultTheme : "http://localhost:9999/themes/debug/index.html",
  defaultPresenter : "http://localhost:9999/themes/debug/index.js",
  stripe: {
    secretKey: "sk_test_ZXdJj4I3Db2iB9ZRm0gqyzDV",
    publicKey: "pk_test_axAR0vF3Qam8zs09JE7t8ZIo"
  },
  sslKeyDirectory: __dirname + '/../ssl/',
  customDomains: true
};