#!/bin/bash
# Runs once, the first time the MySQL container starts with an empty volume.
# - `prisma migrate dev` creates a temporary "shadow" database and replays every migration in it,
#   so the app user needs permission to create and drop databases, and to read and change rows in
#   them (migrations that fix existing data run UPDATE). This is for local development only.
# - The tests use their own database, so running them never touches your development data.
set -e
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
GRANT CREATE, ALTER, DROP, REFERENCES, INDEX, SELECT, INSERT, UPDATE, DELETE ON *.* TO '$MYSQL_USER'@'%';
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_test\`;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_test\`.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
SQL
