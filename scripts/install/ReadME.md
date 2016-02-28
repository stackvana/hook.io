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

sudo cp /usr/bin/env /Users/chroot/bin/
sudo cp /usr/bin/uname /Users/chroot/bin/
sudo cp /usr/bin/dirname /Users/chroot/bin/


# images dont maintain this, needs re-mount
mount -o bind /proc /var/chroot/proc
mount -o bind /dev /var/chroot/dev
mount -o bind /dev/pts /var/chroot/dev/pts
mount -o bind /sys /var/chroot/sys


mknod /dev/null c 1 3
chmod 666 /dev/null
f
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
echo 'nameserver 8.8.4.4' | tee -a /var/chroot/etc/resolv.conf

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
cp /bin/ps /var/chroot/ps
cp /usr/local/bin/node /var/chroot/bin

# at this point, yoou should be able to run:

  chroot /var/chroot bin/node

  cp /usr/local/bin/run-hook /var/chroot/bin
  cp -R /usr/local/lib/node_modules /var/chroot
  cp -R /usr/local/lib/node_modules/hook.io/node_modules /var/chroot

# Installation Additional Languages

## Linux

### Bash

 should already be working at this stage
 cp /bin/bash /var/chroot/bin/bash

### Lua

  apt-get install lua5.2
  cp /usr/bin/lua /var/chroot/bin/
  working???? deps are already copied from node ???

## Perl

  cp /usr/bin/perl /var/chroot/bin/
  working???? deps are already copied from node ???

### PHP

  apt-get install php5-cli
  cp /usr/bin/php /var/chroot/bin

  working???? deps are already copied from node ???

### Python
  
  cp /usr/bin/python /var/chroot/bin/
  cp /usr/bin/python3 /var/chroot/bin/python3
  working???? deps are already copied from node ???

### Ruby

  apt-get install ruby
  cp /usr/bin/ruby /var/chroot/bin/
  
  # error while loading shared libraries: libruby-1.9.1.so.1.9: cannot open shared object file: No such file or directory
  cp /usr/lib/libruby-1.9.1.so.1.9 /var/chroot/usr/lib/libruby-1.9.1.so.1.9
  
  # <internal:gem_prelude>:1:in `require': cannot load such file -- rubygems.rb (LoadError)
  #	from <internal:gem_prelude>:1:in `<compiled>'
  mkdir -p ./usr/lib/ruby/1.9.1/
  cp -R /usr/lib/ruby/1.9.1/ /var/chroot/usr/lib/ruby/

### Scheme

  apt-get install tinyscheme
  mkdir -p /var/chroot/usr/lib/tinyscheme/
  cp /usr/lib/tinyscheme/init.scm /var/chroot/usr/lib/tinyscheme/init.scm

### Smalltalk

  apt-get install gnu-smalltalk
  
  # bin/gst: error while loading shared libraries: libgst.so.7: cannot open shared object file: No such file or directory
  cp /usr/lib/libgst.so.7 /var/chroot/usr/lib/libgst.so.7
  
  # gst: couldn't load system file 'Builtins.st': No such file or directory
  # gst: image bootstrap failed, use option --kernel-directory
  mkdir -p /var/chroot/usr/share/gnu-smalltalk/kernel/
  cp -R /usr/share/gnu-smalltalk/kernel/ /var/chroot/usr/share/gnu-smalltalk/

### Tcl

  apt-get install tcl
  cp /usr/bin/tclsh /var/chroot/bin
  
  # /bin/tclsh: error while loading shared libraries: libtcl8.6.so: cannot open shared object file: No such file or directory
  
  # application-specific initialization failed: Can't find a usable init.tcl in the following directories: 
  #    /usr/share/tcltk/tcl8.6 /lib/tcl8.6 /lib/tcl8.6 /library /library /tcl8.6.1/library /tcl8.6.1/library

  mkdir -p /var/chroot/usr/share/tcltk/tcl8.6
  cp -R /usr/share/tcltk/tcl8.6 /var/chroot/usr/share/tcltk

## Mac OS

mkdir -p /Users/chroot/bin /Users/chroot/usr/lib/system
cp /bin/bash /Users/chroot/bin
cp /usr/lib/* /Users/chroot/usr/lib
cp /usr/lib/system/* /Users/chroot/usr/lib/system

sudo mkdir -p ./System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation

### perl
 
   dyld: Library not loaded:

### php

 dyld: Library not loaded: /System/Library/Frameworks/LDAP.framework/Versions/A/LDAP
 dyld: Library not loaded: /System/Library/Frameworks/Security.framework/Versions/A/Security
 
 dyld: Library not loaded: /System/Library/Frameworks/SystemConfiguration.framework/Versions/A/SystemConfiguration
 dyld: Library not loaded: /System/Library/Frameworks/IOKit.framework/Versions/A/IOKit
 dyld: Library not loaded: /System/Library/PrivateFrameworks/TrustEvaluationAgent.framework/Versions/A/TrustEvaluationAgent
 dyld: Library not loaded: /System/Library/PrivateFrameworks/Heimdal.framework/Versions/A/Heimdal
 dyld: Library not loaded: /System/Library/Frameworks/CFNetwork.framework/Versions/A/CFNetwork
 
   Referenced from: /usr/lib/libcrypto.0.9.8.dylib

### python

 /System/Library/Frameworks/Python.framework/Versions/2.7/Resources/Python.app/Contents/MacOS/Python
 dyld: Library not loaded: /System/Library/Frameworks/Python.framework/Versions/2.7/Python
l

cp -R /usr/local/Cellar/python3/3.4.3_1/Frameworks/Python.framework/Versions/3.4/Resources/Python.app/Contents/MacOS/Python /Users/chroot/usr/local/Cellar/python3/3.4.3_1/Frameworks/Python.framework/Versions/3.4/Resources/Python.app/Contents/MacOS/

Fatal Python error: Failed to open /dev/urandom

ls -l /dev/urandom
crw-rw-rw-  1 root  wheel   13,   1 Sep 24 19:45 /dev/urandom
device order for unrandom is 13, 1
hence:
  sudo mknod urandom c 13 1


### ruby

  /usr/local/lib/ruby - missing rubygems.rb libs
  /System/Library/Frameworks/Ruby.framework/Versions/2.0/
  
### smalltalk

 dyld: Library not loaded: /usr/local/Cellar/gnu-smalltalk/3.2.5_1/lib/libgst.7.dylib
 /usr/local/lib/libsigsegv.2.dylib
 /usr/local/opt/libffi/lib/libffi.6.dylib
 /usr/local/opt/readline/lib/libreadline.6.dylib
 /usr/local/lib/libgmp.10.dylib
 
 /usr/local/Cellar/gnu-smalltalk/3.2.5_1/share/smalltalk/kernel/*.*
 /usr/local/Cellar/gnu-smalltalk/3.2.5_1/share/smalltalk/kernel/Builtins.st
 /usr/local/Cellar/gnu-smalltalk/3.2.5_1/share/smalltalk/kernel/SysDict.st

### scheme

/usr/local/Cellar/tinyscheme/1.40/share/init.scm

### tcl 
  dyld: Library not loaded: /System/Library/Frameworks/Tcl.framework/Versions/8.5/Tcl
  /System/Library/Tcl/tcllib1.12/


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