# Install hook.io

## Requirements

 - Node.js
 - Redis
 - CouchDB
 
Specific installation instructions follow for  Ubuntu 14.04 x64, although with some configuration most systems should work.  

## Steps

### Provision Server

Get a machine to install hook.io on. Instructions follow for Ubuntu 14.04 x64

### update apt-get and install git

   apt-get -y update
   apt-get -y install git-core

### Clone hook.io to server

   git clone http://github.com/bigcompany/hook.io

### Run the install.sh script

Important: It might be easier to open the `install.sh` file in your editor and run each command manually in the terminal one at a time. This way, if something goes wrong you can see exactly where the installation failed.

  cd hook.io
  sh scripts/install/install.sh
  
### Configure SSL / HTTPS Keys

At this point, the installer script should have gotten you to starting hook.io. You will not be able to load the software successfully without adding SSL keys.

It's technically possible to start a version without SSL keys. No documentation for that is currently provided.

see: `/ssl` folder for key structure. copy and paste your keys into this folder.

### Link hook.io binaries to system

   cd hook.io
   npm link

Makes `run-hook` binary available to system.

### Configure chroot jail for workers

# show dynamically linked libraries to binary
# this is important for copying shared resources to the chroot ( which are required for said binary )
# mac os - 'otool -L foo
# linux - ldd foo

cd hook.io
npm link

After creating a folder where the process will be jailed to, you will need to copy over everything that jailed process might need to access.


mkdir /var/chroot/proc
mkdir /var/chroot/dev/pts
mkdir /var/chroot/sys

mount -o bind /proc /var/chroot/proc
mount -o bind /dev /var/chroot/dev
mount -o bind /dev/pts /var/chroot/dev/pts
mount -o bind /sys /var/chroot/sys



mount -o bind /proc /var/jail/_default/proc
mount -o bind /dev /var/jail/_default/dev
mount -o bind /dev/pts /var/jail/_default/dev/pts
mount -o bind /sys /var/_default/sys


# /dev/random might be missing...
mknod -m 644 /dev/random c 1 8
mknod -m 644 /dev/urandom c 1 9
chown root:root /dev/random /dev/urandom

# dns resolve is probably missing...
mkdir -p /var/chroot/run
mount -o bind /run /var/chroot/run
mkdir -p /var/chroot/etc
echo 'nameserver 8.8.4.4' | sudo tee -a /var/chroot/etc/resolv.conf

# var r = require('request'); r.get('http://hook.io');


# probably missing all libaries
# TODO: only copy what is needed
mkdir -p /var/chroot/lib
mkdir -p /var/chroot/usr/lib
mkdir -p /var/chroot/bin
mkdir -p /var/chroot/lib64
cp -R /lib /var/chroot/lib
cp -R /usr/lib /var/chroot/usr
cp -R /lib64 /var/chroot
cp -R /lib/x86_64-linux-gnu /var/chroot/lib

cp /bin/bash /var/chroot/bin
cp /usr/local/bin/node /var/chroot/bin

# at this point, yoou should be able to run:

  chroot /var/chroot bin/node

  cp /usr/local/bin/run-hook /var/chroot/bin
  cp -R /usr/local/lib/node_modules /var/chroot
  cp -R /usr/local/lib/node_modules/hook.io/node_modules /var/chroot

## Mac os

mkdir -p /Users/chroot/bin /Users/chroot/usr/lib/system
cp /bin/bash /Users/chroot/bin
cp /usr/lib/* /Users/chroot/usr/lib
cp /usr/lib/system/* /Users/chroot/usr/lib/system

sudo mkdir -p ./System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation


# img magick ubuntu 

cp -R /etc/ImageMagick /var/chroot/etc/
cp -R /usr/lib/x86_64-linux-gnu/ImageMagick-6.7.7 /var/chroot/usr/lib/x86_64-linux-gnu/

# Start databases

# start redis as service
redis-server

# at this stage, you will want to edit couch's default config
nano /etc/couchdb/default.ini
# Change the following properties
# TODO: automate this
 # bind_address = 0.0.0.0

# setup couch as service
start couchdb

# fix admin party for couch
Go to http://localhost:5984/_utils/ and create an admin account.

stop couchdb

# Change the following properties
# TODO: automate this
 # bind_address = 0.0.0.0
 # [couch_httpd_auth]
 # require_valid_user = true

start couchdb

# login over httpd and create hook database on couch
# http://localhost:5984/_utils/


# update configuration data with new production information
nano config/index.js 

# Replicate Couchdb data
# http://localhost:5984/_utils/

### Setup worker chroot jail

Important: It might be easier to open the `install.sh` file in your editor and run each command manually in the terminal one at a time. This way, if something goes wrong you can see exactly where the installation failed.

  cd hook.io
  sh scripts/install/set-chroot.sh