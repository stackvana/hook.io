<img src="http://hook.io/img/logo.png"></img>
## Open-Source Microservice Hosting Platform 

### Build and deploy HTTP microservices in seconds

To start using hook.io visit the website at [http://hook.io](http://hook.io). Here you will find many examples and documentation on how to use hook.io


**Built with:** [Node.js](http://nodejs.org), [CouchDB](http://couchdb.com), and [Github Gist](http://gist.github.com). [Node Package Manager](http://npmjs.org) modules are fully supported.

Architectural details can be found a bit further down.

## Interested, but too busy to read this now?

If you'd like, you can run the following Curl command to opt-in to our mailing list. We'll periodically send you updates about the project.

`curl hook.io?signup=youremail@marak.com`

Replace youremail@marak.com with your email address.

## What is the purpose of hook.io?


hook.io is an open-source hosting platform for webhooks and microservices. The microservice architectural style is an approach to developing a single application as a suite of small services, each running in its own process and communicating with lightweight mechanisms. hook.io provides an easy way to create, host, and share microservices. Through developing many small re-usable microservices, you can reduce the complexity of your applications while improving stability.



## Why or how would I want to use hook.io?

You should want to use hook.io if it can make your life as a developer easier.


The most *basic use-case* for hook.io is quick and free webhook hosting. You can instantly create a [simple hook](http://hook.io/Marak/echo) which parses the incoming parameters of an HTTP request and performs arbitrary actions on it. For instance: Send an SMS message every-time the Hook is requested as a webpage. Since NPM is supported, you can re-use any existing library from the extensive [NPM module repository](http://npmjs.org). You can also configure Hooks to be executed on a schedule using a [Cron pattern](http://hook.io/cron).



At this point, we will take note that Hooks are [fully streaming](https://github.com/substack/stream-handbook). Inside your Hook source code you have direct access to Node's [http.IncomingMessage](http://nodejs.org/api/http.html#http_http_incomingmessage) and [httpServer.ServerResponse](http://nodejs.org/api/http.html#http_class_http_serverresponse) request and response streams. This means you can treat the inside of a Hook the exact same way as if it were inside a streaming middleware in a regular node http server. Having direct access to these streams is extremely useful and I am unsure if any other microservice hosting providers currently offer this feature.



More *advanced use-cases* for hook.io would be replacing individual parts of your application with microservices. Instead of adding a new route or module to your application , you could instead create a Hook responsible for only one unit of functionality and call it using a regular HTTP request from inside your existing application. One specific example could be building a Hook with a [custom theme](http://hook.io/themes) which acts perfectly as a stand-alone sign-up form. This sign-up form can then be loaded server-side in your application using one HTTP get request. It might sound complicated at first, but integrating microservices with your existing application is actually very easy. In the upcoming weeks we'll work on releasing specific guides for separating application functionalities into microservices.



An *even more advanced usage* would be building a suite of Hooks and composing them to create new and unique applications! Since every Hook understands Standard In and Standard Out and Hooks can [easily call other Hooks](http://hook.io/Marak/merge) from inside each other, there are an endless amount of combinations to be made. This composability enables the foundation for [Flow-based Programming](http://en.wikipedia.org/wiki/Flow-based_programming) without imposing any specific rules for composition. A specific example could be building a Hook ( called "tar" ) responsible for taking in STDIN and streaming out a compressed tar file. Once this Hook is created, you could easily pipe the results of another Hook ( such as an image downloader ) into the "tar" Hook. These Hooks don't exist yet, but I am certain someone will build them in the near future.



## Unix Pipes!

hook.io is very friendly with Unix Pipes. Using STDOUT and STDIN you can connect hook.io to your existing Unix Tool chain. The best way to explain this concept is to review the [Curl examples](http://hook.io/curl).



Here is one specific example of using hook.io to flip a cat upside-down with `cat` and `curl`. You will need to provide your own cat.png



```
cat cat.png | curl -F 'degrees=180' -F 'image=@-;type=image/png' http://hook.io/Marak/image/rotate > upsidedown-cat.png
```



## The Data!

If you noticed in the last example, hook.io is fully capable of streaming binary data. It also supports streaming file uploads, multipart form uploads, and will assist in parsing all incoming form fields, JSON, and query string data.



## Software Architecture

The core software architecture of hook.io is Resource-View-Presenter ( RVP ).

Resources are created using the npm [resource](http://npmjs.org/package/resource) module.

View-Presenters are created using the npm [view](http://npmjs.org/package/view) module with regular HTML, CSS, and JavaScript. The same View-Presenter pattern is also used to implement custom theming for Hooks see: [hook.io/themes](http://hook.io/themes)


## Dependency Tree

hook.io itself is not a very large application. The majority of what powers hook.io is already MIT open-sourced and available for immediate download.

Learning about the following dependencies is a great way to start understanding how hook.io works.

[mschema](http://github.com/mschema/mschema) - Provides validation through-out the entire stack.

[big](http://npmjs.org/package/big) - Small application framework. Provides [website](https://github.com/bigcompany/big/blob/master/apps/website/index.js) app which hook.io extends.

[resource-http](http://github.com/bigcompany/http) - Provides core HTTP server API. Helps in configuring [Express](http://expressjs.com) with middlewares like [Passport](http://passportjs.org/)

[resource-mesh](http://github.com/bigcompany/mesh) - Provides a distributed event emitter mesh using a [star network topography](http://en.wikipedia.org/wiki/Network_topology#Star). hook.io primarily uses this module as a monitoring agent to report status back to our monitoring [sink](https://github.com/bigcompany/big/blob/master/apps/sink/index.js).

[resource-user](http://github.com/bigcompany/user) - Provides basic user API ( signups / logins / encrypted passwords / password resets / etc )


## Server Architecture

There is one front-facing HTTP server and any number of Hook Workers.

The front-facing server is responsible for serving static content, maintaining user session data, and piping requests between the client and Worker.

Workers are responsible for executing user-submitted source code and piping their responses through the front-facing server to the client.

At this point, we will take note that communication between the Hook and client remains streaming throughout the entire architecture. This gives hook.io the ability to perform complex tasks like [transcoding large video streams](http://hook.io/Marak/transcodeVideo) without worrying about clogging up any parts of the system with large memory buffers.

Hook Servers and Hook Workers are immutable and stateless to ensure stability of the platform. They are designed to fail fast and restart fast. [mon](http://github.com/tj/mon) is used as a process supervisor.

This architecture can theoretically scale to upwards of 10,000 concurrent connections. Realistically, it will probably be closer to 4,000. When the site needs to scale past this, we will create several front-facing servers and load balance incoming HTTP requests to them using DNS. 

Hook and User configuration data are stored in a CouchDB database. If the database grows too large, we will split it into several smaller database severs sharded by the first alphabetic letter of every document's primary key.

Source code for Hooks is currently stored on Github as Github Gists. I'd imagine sometime in the future we will add the option to store and edit source code directly on hook.io itself. The project is open-source, so you could be the first to [open up the issue](http://github.com/bigcompany/hook.io/issues/new?title=Add%20ability%20to%20store%20Hook%20Source%20code%20directly%20on%20site%20and%20without%20Github%20Gist)!

## Creating new Hooks

It's very simple. Go to [http://hook.io/new](http://hook.io/new)

## Support

If you run into an issue, have a question, or have feedback with using hook.io you can open up a Github Issue by [clicking here](http://github.com/bigcompany/hook.io/issues/new)

## Adding new NPM Modules to hook.io

The fastest way to get an additional NPM module added to the hook.io platform is to open up a Pull Request modifying [this file](https://github.com/bigcompany/hook.io/blob/master/modules/modules.js).

If your module requires additional dependencies outside of what NPM can install, you can create a custom build script in [this folder](https://github.com/bigcompany/hook.io/tree/master/modules/builds). The hosting environment for hook.io is Ubuntu 14.04.1 LTS (Trusty Tahr) Bash scripts are recommended.

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
