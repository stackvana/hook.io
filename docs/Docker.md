
Running a local development instance of hook.io is simple.

First, you'll need to install [Docker](https://docs.docker.com/engine/installation/).

### Docker???

It's important to note that hook.io is only using `docker` for helping developers get setup with a local development instance. We are not using docker in production and do not recommend using our Docker image and default configurations in production ( as there will be almost no service isolation ).

### Installing hook.io

Once `docker-machine` is installed and running, perform the following commands:

``` bash
git clone https://github.com/bigcompany/hook.io
cd hook.io
docker-compose build
docker-compose up
```

This should start the following services:

 - 1 hook.io front-end load balancer
 - 1 hook.io worker
 - 1 couchdb server
 - 1 redis server

*Note: The `cron` and `hpm` services are not currently included in our docker image. If you require using these services locally they should be easy to add.*


To access these services you'll need to open the current ip address of your docker-machine in the browser.

To find the current address of the Docker machine run: `docker-machine ip`

### Configure the local running hook.io instance

Once the services are started, you'll still need to run one more command.

```bash
curl http://{{your_docker_machine_ip}}/_admin?baseUrl=set
```

Without running this last line, most http redirects and ajax gateways in the system will not work.