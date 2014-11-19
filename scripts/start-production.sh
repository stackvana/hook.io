# start main front-end server
sudo mon -d "sudo node bin/server" --log server-log.txt &&

# start five workers to run hooks
sudo mon -d "sudo node bin/worker" --log worker-logs.txt &&
sudo mon -d "sudo node bin/worker" --log worker-logs.txt &&
sudo mon -d "sudo node bin/worker" --log worker-logs.txt &&
sudo mon -d "sudo node bin/worker" --log worker-logs.txt &&
sudo mon -d "sudo node bin/worker" --log worker-logs.txt


