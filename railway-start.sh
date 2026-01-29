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
echo "Running database migrations..."
if npx prisma migrate deploy; then
  echo "✓ Migrations completed successfully"
else
  echo "✗ Migration failed with exit code $?"
  exit 1
fi

# Start the application
echo "========================================="
echo "Starting Next.js server on port ${PORT:-3000}..."
echo "========================================="
exec node server.js
