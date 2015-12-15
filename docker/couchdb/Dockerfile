FROM klaemo/couchdb:1.6.1

# Require valid user
RUN sed -i'' 's/require_valid_user = false/require_valid_user = true/' /usr/local/etc/couchdb/default.ini

