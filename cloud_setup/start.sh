#!/bin/sh

# Start Cloud SQL Proxy if available
if [ -x "/usr/local/bin/cloud_sql_proxy" ]; then
  echo "Starting Cloud SQL Proxy..."
  /usr/local/bin/cloud_sql_proxy -dir=/cloudsql &
fi

# Start the standalone Next.js server
if [ -f ".next/standalone/server.js" ]; then
  echo "Starting Next.js standalone server..."
  node server.js
else
  echo "Standalone build not found, attempting to start via npm start"
  npm run start
fi
