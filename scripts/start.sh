#trap 'killall node' EXIT
#trap 'killall node' SIGINT

# clear all metrics for running hooks
# this is needed in-case hook.io was shut down abruptly
# will reset all running services concurrency count back to 0
redis-cli del 'metrics/running' &

# start loadbalancer1
node ./bin/services/load-balancer &

# start three front-end web servers
node ./bin/services/web &
node ./bin/services/web &
node ./bin/services/web &

# start five workers to run hooks
node ./bin/services/worker &
node ./bin/services/worker &
node ./bin/services/worker &
node ./bin/services/worker &
node ./bin/services/worker

# &node ./bin/hpm-server

# start cron jobs
# sudo node bin/cron