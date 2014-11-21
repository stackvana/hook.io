# start main front-end server
sudo mon -d "sudo node bin/server" --log server-log.txt &&

# start five workers to run hooks
sudo mon -d "sudo node bin/worker" --log worker-logs.txt &&
sudo mon -d "sudo node bin/worker" --log worker-logs.txt &&
sudo mon -d "sudo node bin/worker" --log worker-logs.txt &&
sudo mon -d "sudo node bin/worker" --log worker-logs.txt &&
sudo mon -d "sudo node bin/worker" --log worker-logs.txt &&

# start cron process
# this will exit(0) every ~60 seconds and restart
sudo mon -d "sudo node bin/cron" --log cron-logs.txt
