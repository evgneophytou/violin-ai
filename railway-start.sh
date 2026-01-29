#!/bin/sh
set -e

echo "========================================="
echo "Starting Violin AI application..."
echo "========================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set!"
  exit 1
fi

echo "DATABASE_URL is set (length: ${#DATABASE_URL})"

# Run database migrations
echo "Syncing database schema..."
if npx prisma db push --accept-data-loss; then
  echo "✓ Schema synced successfully"
else
  echo "✗ Schema sync failed with exit code $?"
  exit 1
fi

# Start the application
echo "========================================="
echo "Starting Next.js server on port ${PORT:-3000}..."
echo "========================================="
exec node server.js
