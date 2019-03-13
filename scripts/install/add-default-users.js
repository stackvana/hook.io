var user = require('../../lib/resources/user');
var config = require('../../config');
user.persist(config.couch);

const create = require('util').promisify(user.create);
const find = require('util').promisify(user.find);

var users = [
  {
    name: 'examples',
    password: 'password',
    email: 'examples@localhost'
  },
  {
    name: 'marak',
    password: 'password',
    email: 'marak@localhost'
  }
];

async function createUsers () {
  for (let u of users) {
    let found = await find({ name: u.name });
    if (found.length === 0) {
      let created = await create({
        name: u.name,
        email: u.email,
        servicePlan: 'pro',
        password: u.password
      });
      console.log('created', created);
    }
  }
  process.exit();
}

createUsers();

