#!/usr/bin/env node

// This is a CommonJS script to avoid ES module issues
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI environment variable is not set');
}

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('motive-archive');
    const deliverables = db.collection('deliverables');

    const cursor = deliverables.find({});
    const docs = await cursor.toArray();

    console.log(`Found ${docs.length} deliverables`);

    for (const doc of docs) {
      if (!doc.editors || !Array.isArray(doc.editors)) {
        console.log(`Skipping ${doc._id} - no editors array`);
        continue;
      }

      const editors = doc.editors.map(editor => {
        if (typeof editor === 'string') {
          return editor;
        }
        return editor.toString();
      });

      await deliverables.updateOne(
        { _id: doc._id },
        { $set: { editors } }
      );

      console.log(`Updated ${doc._id}`);
    }

  } finally {
    await client.close();
  }
}

run().catch(console.error);
