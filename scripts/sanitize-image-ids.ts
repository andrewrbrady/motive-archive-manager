#!/usr/bin/env node

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/motive-archive';

async function sanitizeImageIds() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Collections that have imageIds fields
    const collections = [
      { name: 'cars', fields: ['imageIds', 'processedImageIds'] },
      { name: 'projects', fields: ['imageIds'] },
      { name: 'galleries', fields: ['imageIds'] }
    ];
    
    let totalUpdated = 0;
    
    for (const collectionInfo of collections) {
      console.log(`\n🔍 Processing ${collectionInfo.name} collection...`);
      const collection = db.collection(collectionInfo.name);
      
      for (const field of collectionInfo.fields) {
        console.log(`  📋 Checking field: ${field}`);
        
        // Find documents where the field exists and has string values
        const cursor = collection.find({
          [field]: { $exists: true, $ne: null }
        });
        
        let updatedInField = 0;
        
        while (await cursor.hasNext()) {
          const doc = await cursor.next();
          if (!doc) continue;
          
          const fieldValue = doc[field];
          if (!Array.isArray(fieldValue)) continue;
          
          // Check if any values are strings that need conversion
          const hasStrings = fieldValue.some(id => typeof id === 'string');
          
          if (hasStrings) {
            // Convert all values to ObjectIds
            const sanitizedIds = fieldValue
              .filter(id => id) // Remove null/undefined
              .map(id => {
                if (typeof id === 'string') {
                  if (ObjectId.isValid(id)) {
                    return new ObjectId(id);
                  } else {
                    console.warn(`    ⚠️  Invalid ObjectId string found in ${collectionInfo.name}.${field}: ${id}`);
                    return null;
                  }
                } else if (ObjectId.isValid(id)) {
                  return id; // Already an ObjectId
                } else {
                  console.warn(`    ⚠️  Invalid ID type found in ${collectionInfo.name}.${field}:`, typeof id);
                  return null;
                }
              })
              .filter(id => id !== null); // Remove invalid IDs
            
            // Update the document
            await collection.updateOne(
              { _id: doc._id },
              { 
                $set: { 
                  [field]: sanitizedIds,
                  updatedAt: new Date().toISOString()
                } 
              }
            );
            
            updatedInField++;
            console.log(`    ✅ Updated ${collectionInfo.name} ${doc._id}: ${fieldValue.length} → ${sanitizedIds.length} ObjectIds`);
          }
        }
        
        console.log(`  📊 ${field}: ${updatedInField} documents updated`);
        totalUpdated += updatedInField;
      }
    }
    
    // Handle galleries orderedImages.id field separately
    console.log(`\n🔍 Processing galleries.orderedImages.id...`);
    const galleriesCollection = db.collection('galleries');
    
    const galleriesCursor = galleriesCollection.find({
      orderedImages: { $exists: true, $ne: null, $not: { $size: 0 } }
    });
    
    let galleriesUpdated = 0;
    
    while (await galleriesCursor.hasNext()) {
      const gallery = await galleriesCursor.next();
      if (!gallery || !Array.isArray(gallery.orderedImages)) continue;
      
      let needsUpdate = false;
      const updatedOrderedImages = gallery.orderedImages.map((item: any) => {
        if (item && item.id && typeof item.id === 'string') {
          if (ObjectId.isValid(item.id)) {
            needsUpdate = true;
            return { ...item, id: new ObjectId(item.id) };
          } else {
            console.warn(`    ⚠️  Invalid ObjectId string in orderedImages: ${item.id}`);
            return null;
          }
        }
        return item;
      }).filter((item: any) => item !== null);
      
      if (needsUpdate) {
        await galleriesCollection.updateOne(
          { _id: gallery._id },
          { 
            $set: { 
              orderedImages: updatedOrderedImages,
              updatedAt: new Date().toISOString()
            } 
          }
        );
        
        galleriesUpdated++;
        console.log(`    ✅ Updated gallery ${gallery._id}: orderedImages IDs converted to ObjectIds`);
      }
    }
    
    console.log(`  📊 orderedImages: ${galleriesUpdated} galleries updated`);
    totalUpdated += galleriesUpdated;
    
    console.log(`\n🎉 Sanitization complete! Total documents updated: ${totalUpdated}`);
    
  } catch (error) {
    console.error('❌ Error during sanitization:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the sanitization
sanitizeImageIds().catch(console.error);
