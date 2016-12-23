# clear all metrics for running hooks
# this is needed in-case hook.io was shut down abruptly
# will reset all running services concurrency count back to 0

redis-cli del 'metrics/running' &
# start main front-end server
sudo mon -d "sudo ./bin/services/load-balancer " --log server-log.txt &&

# start three front-end web servers
sudo mon -d "sudo ./bin/services/web" --log worker-logs.txt &&
sudo mon -d "sudo ./bin/services/web" --log worker-logs.txt &&

# start five workers to run hooks
sudo mon -d "sudo ./bin/services/worker" --log worker-logs.txt &&
sudo mon -d "sudo ./bin/services/worker" --log worker-logs.txt &&
sudo mon -d "sudo ./bin/services/worker" --log worker-logs.txt &&
sudo mon -d "sudo ./bin/services/worker" --log worker-logs.txt &&
sudo mon -d "sudo ./bin/services/worker" --log worker-logs.txt &&

# start Hook Packager Manager server
# this managers hook package dependecy installations
sudo mon -d "sudo ./bin/hpm-server" --log hpm-logs.txt &&

# start cron process
# this will exit(0) every ~60 seconds and restart
sudo mon -d "sudo ./bin/cron" --log cron-logs.txt
