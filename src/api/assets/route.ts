import { MongoClient } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const uri = 'mongodb://localhost:27017';
const dbName = 'arb_assets';

export async function POST(request: NextRequest) {
  let client;
  try {
    const { name, description, location } = await request.json();
    if (!name || !description || !location) {
      return NextResponse.json({ error: 'Name, description, and location are required' }, { status: 400 });
    }

    client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    const newAsset = { name, description, location, createdAt: new Date() };
    await db.collection('raw').insertOne(newAsset);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to add asset' }, { status: 500 });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
