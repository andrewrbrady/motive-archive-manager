# Motive Archive Manager Scripts

This directory contains utility scripts for the Motive Archive Manager.

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
