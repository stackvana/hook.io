# install.sh - will bootstrap an ubuntu machine to run hook.io
# TODO: replace this script with a Dockerfile

# update apt-get
apt-get -y update

# install git
apt-get -y install git-core

# get latest stable node as tar
wget https://github.com/joyent/node/tarball/v0.11.16

# extract latest node
tar xf v0.11.16

# change directory into node
cd joyent-node-afeb6e1

# install some missing deps
apt-get -y install g++ curl libssl-dev apache2-utils

# configure
./configure

# install make
apt-get -y install make

# make node
sudo make

# install node
sudo make install

# install couchdb
sudo apt-get install couchdb -y

# at this stage, you will want to edit couch's default config
# TODO: automate this
nano /etc/couchdb/default.ini

# start couch as service
start couchdb

# fix admin party for couch

# create hook database on couch

# clone hook.io main repo
git clone https://github.com/bigcompany/hook.io
cd hook.io
sudo npm install

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
sudo npm install npm
cd modules
sudo node install.js

# run custom builds scripts /modules/builds

# start production
sudo sh scripts/start-production.sh

