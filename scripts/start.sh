#trap 'killall node' EXIT
#trap 'killall node' SIGINT

# clear all metrics for running hooks
# this is needed in-case hook.io was shut down abruptly
# will reset all running services concurrency count back to 0
redis-cli -a "password" del 'metrics/running' &

# start loadbalancer1
./bin/services/load-balancer &

# start three front-end web servers
./bin/services/web &
./bin/services/web &
./bin/services/web &

# start five workers to run hooks
./bin/services/worker &
./bin/services/worker &
./bin/services/worker &
./bin/services/worker &
./bin/services/worker

# &./bin/hpm-server

# start cron jobs
# sudo bin/cron