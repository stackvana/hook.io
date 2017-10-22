var tap = require("tape");
var r = require('../lib/helpers/_request');
var config = require('../config');
var baseURL = config.baseUrl;
var startDevCluster = require('../lib/helpers/startDevCluster');

var testUser = config.testUsers.david;

// TODO: make helper assert method for Vinyl JSON file

var testFile = {
  path:  "hookio-integration-test.txt",
  contents: "hello world"
};

function testAdapter (adapter) {

  tap.test(adapter + ' - attempt to writeFile a file without any auth ( anonymous root )', function (t) {
    r({ uri: baseURL + "/files/writeFile", method: "POST", json: { 
        key: "testKey",
        path: testFile.path,
        adapter: adapter,
        contents: testFile.contents
      }}, function (err, res) {
        t.equal(res.error, true);
        t.equal(res.role, "files::writeFile");
        t.error(err, 'request did not error');
        t.end();
    });
  });

  tap.test(adapter + ' - attempt to readFile the file we just created without any auth ( anonymous root )', function (t) {
    r({ uri: baseURL + "/files/readFile", method: "POST", json: { 
          key: "testKey",
          path: testFile.path,
          adapter: adapter
        } }, function (err, res) {
          //console.log(err, echo)
          t.equal(res.error, true);
          t.equal(res.role, "files::readFile");
          t.error(err, 'request did not error');
          t.end();
    });
  });

  tap.test(adapter + ' - attempt to writeFile a file for david with "admin-access-key" role - invalid key', function (t) {
    r({ uri: baseURL + "/files/writeFile", method: "POST", 
        json: {
          hook_private_key: "wrong_key",
          key: "testKey",
          value: "hello",
          path: testFile.path,
          adapter: adapter,
          contents: testFile.contents
         }
       }, function (err, res) {
          t.error(err, 'request did not error');
          t.equal(res.error, true, "response contains error");
          t.equal(res.type, "unauthorized-role-access", "has correct error type");
          t.end();
    });
  });
  
  // TODO: better format of returned keys
  tap.test(adapter + ' - attempt to writeFile a file for david with "file-access-key" role - correct key', function (t) {
    r({ uri: baseURL + "/files/writeFile", method: "POST", 
        json: { 
          hook_private_key: testUser.admin_key, 
          path: testFile.path,
          contents: testFile.contents,
          adapter: adapter
        }
      }, function (err, file) {
      t.error(err, 'request did not error');
      t.equal(file.path, testFile.path);
      t.end();
    });
  });

  tap.test(adapter + ' - attempt to readFile a file for david with "admin-access-key" role - invalid key', function (t) {
    r({ uri: baseURL + "/files/readFile", method: "POST",
        json: { 
          hook_private_key: "wrong_key",
          path: testFile.path,
          contents: testFile.contents,
          adapter: adapter
        }
      }, function (err, res) {
        t.error(err, 'request did not error');
        t.equal(res.error, true, "response contains error");
        t.equal(res.type, "unauthorized-role-access", "has correct error type");
        t.end();
    });
  });

  tap.test(adapter + ' - attempt to readFile a file for david with "admin-access-key" role - correct key', function (t) {
    r({ uri: baseURL + "/files/readFile", method: "POST", 
        json: { 
          hook_private_key: testUser.admin_key,
          path: testFile.path,
          adapter: adapter
        }
      }, function (err, file) {
      t.error(err, 'request did not error');
      t.equal(typeof file, "string", "returned file as string");
      t.equal(file, "hello world", "returned correct value");
      t.end();
    });
  });

  tap.test(adapter + ' - attempt to readFile a file - as vinyl - for david with "admin-access-key" role - correct key', function (t) {
    r({ uri: baseURL + "/files/readFile", method: "POST",
        json: {
          hook_private_key: testUser.admin_key,
          path: testFile.path,
          adapter: adapter,
          vinyl: true
        }
      }, function (err, file) {
      t.error(err, 'request did not error');
      t.equal(typeof file, "object", "returned file object");
      t.equal(file.contents, "hello world", "returned correct value");
      t.end();
    });
  });

  tap.test(adapter + ' - attempt to readdir for david with "admin-access-key" role - correct key', function (t) {
    r({ uri: baseURL + "/files/readdir", method: "GET",
        headers: { "hookio-private-key": testUser.admin_key },
        json: {
          hook_private_key: testUser.admin_key,
          path: "hookio-vfs",
          adapter: adapter
        }
      }, function (err, files) {
        t.error(err, 'request did not error');
        t.equal(files instanceof Array, true, "returned array");
        t.equal(files.length > 0, true, "array has items");
        t.end();
    });
  });

  tap.test(adapter + ' - attempt to removeFile a file for for david with "admin-access-key" role - invalid key', function (t) {
    r({ uri: baseURL + "/files/removeFile", method: "POST", 
        json: {
          hook_private_key: "wrong_key",
          path: testFile.path,
          adapter: adapter
        }
      }, function (err, res) {
        t.error(err, 'request did not error');
        t.equal(res.error, true, "response contains error");
        t.equal(res.type, "unauthorized-role-access", "has correct error type");
        t.end();
    });
  });

  tap.test(adapter + ' - attempt to removeFile a file for david with "admin-access-key" role - correct key', function (t) {
    r({ uri: baseURL + "/files/removeFile", method: "POST",
        json: {
          hook_private_key: testUser.admin_key,
          path: testFile.path,
          adapter: adapter
        }
      }, function (err, res) {
        t.error(err, 'request did not error');
        t.equal(res, "removing");
        t.end();
    });
  });

  /*
  tap.test(adapter + ' - attempt to readFile the deleted for david with "admin-access-key" role - correct key', function (t) {
    r({ uri: baseURL + "/files/readFile", method: "POST", 
        json: {
          hook_private_key: testUser.hook_private_key,
          path: testFile.path,
          adapter: adapter
        }
      }, function (err, res) {
      t.error(err, 'request did not error');
      t.equal(res, "Not Found", "returned null");
      t.end();
    });
  });
  */

};

tap.test('start the dev cluster', function (t) {
  startDevCluster({}, function (err) {
    t.ok('cluster started');
    // should not require a timeout, probably issue with one of the services starting
    // this isn't a problem in production since these services are intended to start independant of each other
    setTimeout(function(){
      t.end('dev cluster started');
    }, 2000);
  });
});

testAdapter('google');

tap.test('perform hard shutdown of cluster', function (t) {
  t.end('cluster is shutting down');
  setTimeout(function(){
    process.exit();
  }, 10);
});


return;
//testAdapter('sftp');
testAdapter('amazon');
//testAdapter('rackspace');
//testAdapter('microsoft');

return;

return;
testAdapter();

return;





// TODO: make test to ensure no cross-contamination of files access