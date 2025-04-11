#!/bin/bash

# Set up environment
cd "$(dirname "$0")/../.."
export PATH="/opt/homebrew/bin:$PATH"
export NODE_ENV=development

echo "Running from directory: $(pwd)"

# Load environment variables
if [[ -f .env ]]; then
  echo "Loading .env file"
  export $(grep -v '^#' .env | xargs)
fi

if [[ -f .env.local ]]; then
  echo "Loading .env.local file"
  export $(grep -v '^#' .env.local | xargs)
fi

# Check critical environment variables
echo "Checking environment variables..."
if [[ -z "$MONGODB_URI" ]]; then
  echo "ERROR: MONGODB_URI not set"
  exit 1
fi

if [[ -z "$FIREBASE_PROJECT_ID" ]] || [[ -z "$FIREBASE_CLIENT_EMAIL" ]] || [[ -z "$FIREBASE_PRIVATE_KEY" ]]; then
  echo "ERROR: Firebase credentials not set correctly"
  exit 1
fi

echo "All required environment variables are set"

# Run the migration directly with tsx
echo "Running migration script..."
/opt/homebrew/bin/npx tsx src/scripts/migrate-deliverable-editors.ts

# Exit with the status code from the previous command
exit $? 