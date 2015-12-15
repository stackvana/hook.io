FROM node:0.12.7-wheezy
#FROM ubuntu:14.04

# update apt-get
RUN apt-get -y update && apt-get -y upgrade

# install build-essential
RUN apt-get -y install build-essential

RUN apt-get -y install binutils debootstrap

RUN cd /tmp; git clone https://github.com/tj/mon; cd mon; make install