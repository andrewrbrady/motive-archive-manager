# Deliverable Editor Migration

This migration script updates deliverables in MongoDB that have editor names (strings) to use Firebase UIDs instead.

## Purpose

As part of the transition from MongoDB user management to Firebase/Firestore, this script:

1. Finds all deliverables with editor names but no Firebase UID assigned
2. For each deliverable, searches for a matching user in Firestore by name
3. Updates the deliverable with the Firebase UID of the matched user
4. Logs all operations and provides statistics on the migration process

## Running the Migration

There are several ways to run the migration, with Option 1 being the most reliable:

### Option 1: Run directly with tsx (recommended)

```bash
/opt/homebrew/bin/npx tsx src/scripts/migrate-deliverable-editors.ts
```

### Option 2: Package script

```bash
/opt/homebrew/bin/npm run migrate:deliverable-editors-direct
```

### Option 3: NodeJS with ts-node loader

```bash
/opt/homebrew/bin/npm run migrate:deliverable-editors-node
```

### Option 4: Simple runner script

```bash
/opt/homebrew/bin/npm run migrate:deliverable-editors-simple
```

### Option 5: Standard migration script

```bash
/opt/homebrew/bin/npm run migrate:deliverable-editors
```

## Migration Process

The script will:

1. Connect to MongoDB
2. Find all deliverables with editor names but no Firebase UID
3. Fetch all users from Firestore
4. Match each deliverable's editor name to a Firestore user
5. Update the matched deliverables with the Firebase UID
6. Log detailed statistics about the migration

## Matching Logic

The script uses three strategies to match editor names to Firestore users:

1. Direct match: Exact match between editor name and user name (case-insensitive)
2. Contains match: User name contains the editor name
3. Partial match: Editor name contains the user name (for names longer than 3 characters)

## Expected Output

The script will log detailed information about the migration process, including:

- Number of deliverables found for migration
- Number of users fetched from Firestore
- For each deliverable:
  - Whether a matching user was found
  - The Firebase UID assigned (if found)
- Final statistics:
  - Total deliverables processed
  - Number of successful matches
  - Number of unmatched deliverables
  - Number of errors encountered

## Troubleshooting

If the migration fails, check:

1. That both MongoDB and Firebase connections are properly configured
2. That users have been migrated to Firestore already
3. That the editor names in deliverables have corresponding names in Firestore

For unmatched users, you may need to manually match and update deliverables.
