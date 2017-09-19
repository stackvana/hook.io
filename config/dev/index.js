module['exports'] = {
  dev: false,
  superadmin: {
    "name": "superadmin",
    "password": "footy",
    "super_private_key": "1234"
  },
  oys_private_key: 'e31b6a83-a92f-48b4-830a-7d384b52c3c6', //hard-coded to "hookio" user on oys
  site: {
    port: 9999,
    host: "0.0.0.0",
    https: false,
    roots: ["hookio", "0.0.0.0", "localhost", "hook.io", "www.hook.io"],
    secret: "change secret",
    redis: {
      prefix: '/session/',
      port: 6379,
      password: "password",
      host: "redis"
    }
  },
  // contains definitions for elastic server pools
  pools : {
    // Note: All services will auto-port up based on the first available port after the starting port
    // this allows us define ranges of ports of the elastic pool instead of pre-configuring the pool statically
    // Note: All configuration values are capable of push / pull updates via integrated `OceanYetStorms.com` server
    web: [],
    worker: [],
    lb: []
  },
  web: {
    port: 11000,
    host: "0.0.0.0",
    https: false,
    registerWithLoadBalancer: true,
    roots: ["hookio", "0.0.0.0", "localhost", "hook.io", "www.hook.io"],
    secret: "change secret",
    redis: {
      prefix: '/session/',
      port: 6379,
      password: "password",
      host: "redis"
    }
  },
  balancer: {
    port: 9999,
    host: "0.0.0.0",
    https: false,
    roots: ["hookio", "0.0.0.0", "localhost", "hook.io", "www.hook.io", "couch"],
    secret: "change secret",
    redis: {
      prefix: '/session/',
      port: 6379,
      password: "password",
      host: "redis"
    }
  },
  //baseUrl: "http://localhost:9999",
  baseUrl: "http://localhost:9999",
  couch: {
    "database": "hook",
    "type": "couch2",
    "username": "admin",
    "password": "password",
    "port": 5984,
    "host": "couch"
  },
  redisCache: {
    port: 6379,
    password: "password",
    host: "redis"
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
  defaultTheme : "http://localhost:9999/themes/none/index.html", // should be https?
  defaultPresenter : "http://localhost:9999/themes/none/index.js",
  stripe: {
    secretKey: "sk_test_ZXdJj4I3Db2iB9ZRm0gqyzDV",
    publicKey: "pk_test_axAR0vF3Qam8zs09JE7t8ZIo"
  },
  email: {
    "provider": "mock",
    "api_user": "abc",
    "api_key": "1234"
  },
  cacheView: false,
  // tempDirectory: __dirname + "/../temp/",
  tempDirectory: "/hook-temp/",
  sslKeyDirectory: '/src/ssl/',
  chrootDirectory: '/var/chroot',
  //sslKeyDirectory: __dirname + '/../ssl/',
  //chrootDirectory: '/Users/worker',
  chrootUser: 'worker',
  useNSJAIL: false,
  useChroot: false,
  locales: {
    locales: ['en', 'de']
  },
  worker: {
    startingPort: 10000,
    registerWithLoadBalancer: true,
    nproc: {
      soft: 15000,
      hard: 20000
    },
    //npmPath: __dirname + '/../../../../stackvana/microcule/' || "/Users/chroot/",
    npmPath: "/var/chroot/root/microcule/",
    publicIP: 'localhost'
  },
  customDomains: false,
  MAX_SERVICE_EXECUTIONS_PER_CYCLE: Infinity,
  MAX_SERVICE_CONCURRENCY: 10,
  UNTRUSTED_HOOK_TIMEOUT: 10000,
  messages: {
    childProcessSpawnError: require('../messages/childProcessSpawnError'),
    serviceExecutionTimeout: require('../messages/serviceExecutionTimeout'),
    unauthorizedRoleAccess: require('../messages/unauthorizedRoleAccess')
  },
  app: { // TODO: make able to white-label easily
    name: "hook.io",
    // host: "https://hook.io",
    url: "http://localhost:9999",
    ws: "ws://localhost:9999/",
    //url: "https://hook.io",
    domain: "localhost",
    port: "9999",
    logo: "http://localhost:9999/img/logo.png",
    logoInverse: "http://localhost:9999/img/logo-inverse.png",
    adminEmail: "hookmaster@hook.io"
  }
};
