#!/bin/bash

# Migrate Deliverable Editors Script
# This script handles running the migration with proper environment setup

# Change to the project root directory
cd "$(dirname "$0")/../.."

# Ensure the right node environment
export PATH="/opt/homebrew/bin:$PATH"
export NODE_ENV=development

echo "Running migration script from $(pwd)"
echo "Using Node: $(which node)"
echo "Using npm: $(which npm)"
echo "Using tsx: $(which tsx)"

# Try to run the migration with tsx first
echo "Attempting to run migration with tsx..."
/opt/homebrew/bin/npx tsx src/scripts/migrate-deliverable-editors.ts

# Check if the first attempt was successful
if [ $? -ne 0 ]; then
  echo "First attempt failed, trying with node directly..."
  # Fall back to node with ts-node loader
  /opt/homebrew/bin/node --loader ts-node/esm src/scripts/migrate-deliverable-editors.ts
fi

# Final exit
exit $? 