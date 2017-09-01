module['exports'] = {
  baseUrl: "http://localhost:9999",
  wsUrl: "localhost:9999",
  host: 'ondemand.saucelabs.com',
  port: 8081,
  user: "Marak",
  key: "dce5a9ba-c8cb-489e-8916-b22a05972fc5",
  superadmin: {
    super_private_key: "1234"
  },
  testUsers: {
    "bobby": {
      name: "bobby",
      admin_key: "ad255b3e-833e-41e6-bc68-23439ff27f65", // admin-access-key
      run_key: "e27b1183-9375-4b64-ad2f-76a2c8ebd064", // only has hook::run
      read_only: "57a45b7c-7bcd-4c66-a7d4-c847e86764c7", // has only hook::logs::read, events::read,
      file_admin: "977e9480-078a-40ce-8f35-6fd252996118", // has file::* events 
      keys_admin: "977e9480-078a-40ce-8f35-6fd252996118", // has keys::* events,
      hookSdk: {
        host: "localhost",
        port: 9999,
        protocol: 'http://',
        hook_private_key: 'ad255b3e-833e-41e6-bc68-23439ff27f65' // testUser.admin_key
      }
    },
    "david": {
      name: "david",
      admin_key: "f34a3112-fb82-4092-8ea7-912fa11ba6dd",
      run_key: "f34a3112-fb82-4092-8ea7-912fa11ba6dd",
      hook_private_key: "f34a3112-fb82-4092-8ea7-912fa11ba6dd",
      hookSdk: {
        host: "localhost",
        port: 9999,
        protocol: 'http://',
        hook_private_key: 'f34a3112-fb82-4092-8ea7-912fa11ba6dd' // testUser.admin_key
      }
    }
  }
};

// TODO: cleanup test users and cleans, better setup / teardown
// uncomment out additional tests with more granular role permission checks