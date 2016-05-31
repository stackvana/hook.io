# install.sh - will bootstrap an ubuntu machine to run hook.io
# TODO: replace this script with a Dockerfile

cd ..
cd ..
cd ..

# update apt-get
apt-get -y update

# install git
apt-get -y install git-core

# get latest stable node as tar
wget https://github.com/nodejs/node/archive/v4.4.4.zip

sudo apt-get install unzip

# extract latest node
# tar xf v4.4.4
unzip v4.4.4.zip

# change directory into node
# cd joyent-node-bf88623
cd node-4.4.4

# install some missing deps
apt-get -y install g++ curl libssl-dev apache2-utils

# configure
./configure

# install make
apt-get -y install make

# make node
make

# install node
make install

# node -v should be working at this point

# install couchdb
apt-get install couchdb -y

# install redis
apt-get install redis-server -y

# start redis as service
redis-server

# at this stage, you will want to edit couch's default config
# TODO: automate this
  # bind_address = 0.0.0.0
  # [couch_httpd_auth]
  # require_valid_user = true
nano /etc/couchdb/default.ini

# start couch as service
start couchdb

# fix admin party for couch
# create hook database on couch
# http://localhost:5984/_utils/

# cd into main hook.io main repo
cd hook.io

# install hook.io deps
npm install

# update configuration data with new production information
nano config/index.js 

# install mon
cd ..
git clone https://github.com/tj/mon
cd mon
make install

# install user modules
cd ..
cd hook.io
npm install npm
cd modules
node install.js

# run custom builds scripts /modules/builds
# TODO: automate
# see: /modules/builds folder for individual package build instructions

# start production
sh scripts/start-production.sh

