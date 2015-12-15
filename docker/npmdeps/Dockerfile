FROM nodebase

COPY . /src

RUN rm -rf /src/node_modules

RUN npm install -g npm

RUN cd /src; npm install