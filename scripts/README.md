# Motive Archive Manager Scripts

This directory contains utility scripts for managing the Motive Archive Manager database.

## Available Scripts

### Remove Duplicate Images

The `remove-duplicate-images.js` script identifies and removes duplicate car images from the database. Duplicates are identified based on identical URLs.

#### What it does:

1. Fetches all cars from the database
2. For each car, checks for duplicate images based on URL
3. Keeps one instance of each unique image and removes duplicates
4. Updates the car's `imageIds` array to remove references to deleted images
5. Identifies and fixes references to non-existent image IDs
6. Checks for orphaned images (images not referenced by any car)

#### Usage

First, ensure you have the correct environment variables set up in a `.env` file (in the scripts directory):

```
MONGODB_URI=mongodb://username:password@host:port/database
MONGODB_DB=motive_archive
```

You can run the script in two modes:

**Dry Run (No Deletion):**

```bash
# Using npm scripts
cd scripts
npm run remove-duplicates:dry

# Or directly
node remove-duplicate-images.js
```

**Delete Mode:**

```bash
# Using npm scripts
cd scripts
npm run remove-duplicates

# Or directly
node remove-duplicate-images.js --delete
```

**Important:** Always run in dry-run mode first to see what would be deleted, before running in delete mode.

### Standardize Data

The `standardize.js` script standardizes data formats in the database.

```bash
# Using npm scripts
cd scripts
npm run standardize

# Or directly
node run-standardize.js
```

## sanitize-car-images.js

This script helps clean up the database by removing the deprecated `images` property from car documents that have both `images` and `imageIds` fields.

### Background

In our codebase, we're standardizing on using only `imageIds` (arrays of ObjectIds that point to documents in the "images" collection) for storing image references. Some car documents still have the deprecated `images` field, which needs to be removed.

### Usage

```bash
node sanitize-car-images.js
```

The script will:

1. Connect to the MongoDB database
2. Find all car documents that have both `images` and `imageIds` fields
3. Remove the `images` property from these documents
4. Report on how many documents were affected

### Notes

- This is a one-time cleanup script that should be run to standardize the database
- After running, verify that the car API endpoints are still working correctly
- All car API endpoints have been updated to use `imageIds` instead of `images`

## Adding New Scripts

To add a new script:

1. Create your JavaScript file in the `scripts` directory
2. Add the script to `package.json` in the scripts section
3. Update this README.md with documentation about your script

## Standardize Raw Assets Script

The `standardize-raw-assets.js` script standardizes the raw_assets collection by:

1. Ensuring all documents with `cars` data have proper `carIds` references
2. Removing the `cars` field from all documents

### Prerequisites

- Node.js 16 or higher
- MongoDB connection URI (in `.env` file or provided as an argument)

### Setup

1. Navigate to the scripts directory:

   ```
   cd scripts
   ```

2. Install dependencies using Homebrew npm:

   ```
   /opt/homebrew/bin/npm install
   ```

3. Create a `.env` file in the scripts directory with your MongoDB connection details:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
   MONGODB_DB=motive_archive
   ```

### Running the Script

Run the standardization script using Homebrew npm:

```
/opt/homebrew/bin/npm run standardize
```

Or run it directly with Node:

```
/opt/homebrew/bin/node run-standardize.js
```

### What the Script Does

1. Finds all documents that have the `cars` field but are missing the `carIds` field
2. Extracts car IDs from the `cars` array and sets them in the `carIds` field
3. Removes the `cars` field from all documents
4. Verifies that no documents still have the `cars` field

### Output

The script will output a summary of the changes made:

```
Standardization completed successfully!
Summary:
- Processed 10 assets with 'cars' field but missing 'carIds'
- Updated carIds for 10 assets
- Removed 'cars' field from 50 assets
- Remaining assets with 'cars' field: 0
```

If any documents still have the `cars` field after running the script, you may need to run it again or check those documents manually.

### Troubleshooting

If you encounter any issues:

1. Make sure your MongoDB URI is correct in the `.env` file
2. Ensure you're using the Homebrew version of Node and npm
3. Check that the MongoDB user has write permissions to the database
