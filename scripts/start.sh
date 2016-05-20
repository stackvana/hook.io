#trap 'killall node' EXIT
#trap 'killall node' SIGINT


# start loadbalancer1
node ./bin/services/load-balancer &

# start three front-end web servers
node ./bin/services/web &
node ./bin/services/web &
node ./bin/services/web &

# start websocket server
# node ./bin/websocket-server &

# start five workers to run hooks
node ./bin/worker &
node ./bin/worker &
node ./bin/worker &
node ./bin/worker &
node ./bin/worker 

# &node ./bin/hpm-server



# start cron jobs
# sudo node bin/cron