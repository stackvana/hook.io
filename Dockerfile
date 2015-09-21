FROM ubuntu:14.04

COPY . /src

# update apt-get
RUN apt-get -y update

# install git
RUN apt-get -y install git-core

# install python
RUN apt-get -y install python

# install wget
RUN apt-get -y install wget

# install make
RUN apt-get -y install make

# install some missing deps
RUN apt-get -y install g++ curl libssl-dev apache2-utils

RUN \
  cd /tmp && \
  wget https://github.com/joyent/node/tarball/v0.12.7 && \
  tar xf v0.12.7 && \
  cd nodejs-node-v0.x-archive-bf88623 && \
  ./configure && \
  CXX="g++ -Wno-unused-local-typedefs" make && \
  CXX="g++ -Wno-unused-local-typedefs" make install && \
  printf '\n# Node.js\nexport PATH="node_modules/.bin:$PATH"' >> /.bashrc

RUN cd /src; npm install

# RUN which node

EXPOSE  9999
CMD ["/usr/local/bin/node", "/src/bin/minServer.js"]