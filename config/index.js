module['exports'] = {
  dev: false,
  site: {
    port: 9999,
    host: "0.0.0.0",
    https: process.env['NODE_ENV'] === 'production',
    roots: ["hookio", "0.0.0.0", "localhost", "hook.io", "www.hook.io"]
  },
  workers: [
   { host: "worker0", port: "10000" }
  ],
  baseUrl: "http://localhost:9999",
  couch: {
    "database": "hook",
    "type": "couchdb",
    "username": "admin",
    "password": "password",
    "port": 5984,
    "host": "couch"
  },
  redis: {
    port: 6379,
    password: "password",
    host: "redis"
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
  worker: {
    //npmPath: path.resolve("~/"),
    nproc: {
      soft: 500,
      hard: 1000
    }
  },
  defaultTheme : "http://localhost:9999/themes/none/index.html", // should be https?
  defaultPresenter : "http://localhost:9999/themes/none/index.js",
  stripe: {
    secretKey: "sk_test_ZXdJj4I3Db2iB9ZRm0gqyzDV",
    publicKey: "pk_test_axAR0vF3Qam8zs09JE7t8ZIo"
  },
  email: {
    "provider": "mock",
    "api_user": "marak",
    "api_key": "abcd"
  },
  cacheView: false,
  // tempDirectory: __dirname + "/../temp/",
  tempDirectory: "/hook-temp/",
  sslKeyDirectory: '/src/ssl/',
  chrootDirectory: '/var/chroot',
  //sslKeyDirectory: __dirname + '/../ssl/',
  //chrootDirectory: '/Users/chroot',
  useChroot: true,
  locales: {
    locales: ['en', 'de']
  },
  worker: {
    nproc: {
      soft: 500,
      hard: 1000
    },
    npmPath: "/Users/chroot/"
  },
  customDomains: true,
  UNTRUSTED_HOOK_TIMEOUT: 10000,
  messages: {
    childProcessSpawnError: require('./messages/childProcessSpawnError'),
    serviceExecutionTimeout: require('./messages/serviceExecutionTimeout'),
    unauthorizedRoleAccess: require('./messages/unauthorizedRoleAccess')
  }
};
