#!/bin/sh
set -e

echo "Starting Violin AI application..."

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting Next.js server..."
exec node server.js
