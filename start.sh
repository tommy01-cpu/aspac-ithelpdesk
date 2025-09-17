#!/bin/sh

# Start Cloud SQL Proxy if available and CLOUD_SQL_CONNECTION_NAME is set
if [ -x "/usr/local/bin/cloud_sql_proxy" ] && [ -n "$CLOUD_SQL_CONNECTION_NAME" ]; then
  echo "Starting Cloud SQL Proxy for connection: $CLOUD_SQL_CONNECTION_NAME"
  /usr/local/bin/cloud_sql_proxy $CLOUD_SQL_CONNECTION_NAME &
  # Give proxy a moment to start
  sleep 2
fi

# Start the standalone Next.js server
if [ -f "server.js" ]; then
  echo "Starting Next.js standalone server..."
  node server.js
elif [ -f ".next/standalone/server.js" ]; then
  echo "Starting Next.js standalone server from .next/standalone..."
  cd .next/standalone && node server.js
else
  echo "Standalone build not found, attempting to start via npm start"
  npm run start
fi
