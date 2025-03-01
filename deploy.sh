#!/bin/bash

# Set up Node 20 environment
export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:$PATH"

# Check if a commit message was provided
if [ $# -eq 0 ]; then
  echo "Usage: ./deploy.sh \"Your commit message\""
  exit 1
fi

COMMIT_MESSAGE="$1"

# Verify Node version
echo "Using Node version: $(node -v)"

# Git operations
echo "Adding and committing changes..."
git add .
git commit -m "$COMMIT_MESSAGE"

# Run build
echo "Running production build..."
npm run build

# Push to current branch
echo "Pushing to remote..."
git push origin $(git branch --show-current)

echo "Build and deployment complete." 