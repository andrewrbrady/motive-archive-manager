import { MongoClient } from 'mongodb';

const uri = 'mongodb://localhost:27017';
const dbName = 'motive_archive';

export default async function handler(req, res) {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db(dbName);
    const carsCollection = db.collection('cars');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const cars = await carsCollection.find({})
      .skip(skip)
      .limit(limit)
      .toArray();
      
    const total = await carsCollection.countDocuments();
    
    await client.close();
    
    res.status(200).json({
      cars,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
}