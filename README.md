<img src="http://hook.io/img/logo.png"></img>
## Hosting for Webhooks and Transform Streams

### Build and deploy HTTP microservices in seconds

To start using hook.io visit the website at [http://hook.io](http://hook.io). Here you will find many examples and documentation on how to use hook.io

## Creating new Hooks

It's very simple. Go to [http://hook.io/new](http://hook.io/new)

## Support

If you run into an issue, have a question, or have feedback with using hook.io you can open up a Github Issue by [clicking here](http://github.com/bigcompany/hook.io/issues/new)

## Adding new NPM Modules to hook.io

The fastest way to get an additional NPM module added to the hook.io platform is to open up a Pull Request modifying [this file](https://github.com/bigcompany/hook.io/blob/master/modules/modules.js).

If your module requires additional dependencies outside of what NPM can install, you can create a custom build script in [this folder](http://github.com/bigcompany/hook.io/master/modules/build/). The hosting environment for hook.io is Ubuntu 10.04. Bash scripts are recommended.

## Dependency Tree

hook.io itself is not a very large application. The majority of what powers hook.io is already MIT open-sourced and available for immediate download.

Learning about the following dependencies is a great way to start understanding how hook.io works.

 - [big](http://github.com/bigcompany/big)
 - [resource](http://github.com/bigcompany/resource)
 - [resource-http](http://github.com/bigcompany/http)
 - [resource-mesh](http://github.com/bigcompany/mesh)
 - [resource-user](http://github.com/bigcompany/user)
 - [view](http://github.com/bigcompany/view)
 - [mschema](http://github.com/mschema/mschema)

## Testing your Hook

If you only need to test your Hook code, you can run `./bin/test-hook` without having to setup the full hook.io stack.

## Setting up a private hook.io

Before setting up a private hook.io server, you should try the free hosted version at [http://hook.io](http://hook.io)

Setting up a private hook.io server is easy! You'll want to clone this repository, install the dependencies, and run the `start.sh` script. There currently are not detailed installation instructions and you will need to configure a few dependencies ( such as couchdb and github api ).

If you want to run Hooks without any additional dependencies, try running `./bin/test-hook`.

## Workers

Hooks are executed on *stateless* isolated workers to help facilitate scaling and to ensure stability in the core application. These workers are responsible for running user-submitted Hook source code and piping their responses back to the main server. If running untrusted user-submitted code, you will need to isolate these workers.

see: `./bin/worker` and `./bin/test-worker`

## User process isolation

If you plan to run a hook.io server that allows user-submitted code, you will need to setup process isolation per user on every worker so that user-submitted Hooks will not potentially affect performance of other users or interact with parts of the system the user should not have permission to access.

<a href="http://docker.com">Docker</a> is a great tool to start with.

## Contributing

Contributions are welcomed and much appreciated. Simply open up a Github Pull Request to start the discussion.

All contributors must sign our <a href="https://www.clahub.com/agreements/bigcompany/hook.io">Contributor License Agreement</a>. 

This is a simple document to help protect both the hook.io project and your rights as a contributor.

## Licensing

hook.io is licensed under the Affero General Public License (AGPL) open-source software license. 

This license favors the developer ( **you** ) and ensures that all corporate contributions are made available to the public.

If this license is not suitable for your use-case please email <a href="mailto:support@marak.com">support@marak.com</a>. Individual licenses are available upon request.
