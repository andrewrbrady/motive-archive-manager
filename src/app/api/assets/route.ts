import { MongoClient } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const uri = 'mongodb://localhost:27017';
const dbName = 'arb_assets';

export async function GET(request: NextRequest) {
  let client;
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const searchQuery = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    const query = searchQuery
      ? {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { description: { $regex: searchQuery, $options: 'i' } },
          ],
        }
      : {};

    const [assets, totalCount] = await Promise.all([
      db
        .collection('raw')
        .find(query)
        .sort({ name: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('raw').countDocuments(query),
    ]);

    return NextResponse.json({
      assets,
      pagination: {
        totalItems: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        itemsPerPage: limit,
        sortOrder,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch assets' }, { status: 500 });
  } finally {
    if (client) {
      await client.close();
    }
  }
}

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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to add asset' }, { status: 500 });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
