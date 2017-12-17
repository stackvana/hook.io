FROM redis

# Scripts use a password
COPY redis.conf /usr/local/etc/redis/
RUN mkdir -p /usr/local/var/db/redis
CMD [ "redis-server", "/usr/local/etc/redis/redis.conf" ]
