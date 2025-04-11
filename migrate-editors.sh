#!/bin/bash

# Simple script to run the deliverable editors migration

echo "Running deliverable editors migration..."

# Ensure PATH includes Homebrew
export PATH="/opt/homebrew/bin:$PATH"

# Run migration directly with tsx 
/opt/homebrew/bin/npx tsx --experimental-vm-modules src/scripts/migrate-deliverable-editors.ts

# Get exit code
EXIT_CODE=$?

# Exit with the same code
echo "Migration completed with exit code: $EXIT_CODE"
exit $EXIT_CODE 