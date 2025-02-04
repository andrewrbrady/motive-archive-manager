# Getting MongoDB Atlas API Keys

1. Log in to MongoDB Atlas at https://cloud.mongodb.com
2. Click on your organization name in the top left
3. Go to "Access Manager" in the left sidebar
4. Click on "API Keys" tab
5. Click "Create API Key"
6. Give it a name like "Vector Search Manager"
7. Select "Organization Project Creator" role
8. Click "Next"
9. Copy the Public Key and Private Key
10. Add them to your `.env` file:

```
MONGODB_ATLAS_PUBLIC_KEY=your_public_key
MONGODB_ATLAS_PRIVATE_KEY=your_private_key
```

11. Click "Done" in the Atlas UI

After adding the keys to your `.env` file, you can run:

```bash
node scripts/update-atlas-index.js
```
