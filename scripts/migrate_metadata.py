import os
import time
import asyncio
import aiohttp
from pymongo import MongoClient
from urllib.parse import urlparse
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Configuration
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME = 'motive_archive'
BATCH_SIZE = 3  # Process 3 images at a time to respect Cloudflare rate limits
DELAY = 1  # 1 second delay between batches
CLOUDFLARE_ACCOUNT_ID = os.getenv('CLOUDFLARE_ACCOUNT_ID')
CLOUDFLARE_API_TOKEN = os.getenv('CLOUDFLARE_API_TOKEN')

def extract_image_id(url):
    """Extract Cloudflare image ID from URL."""
    try:
        path = urlparse(url).path
        # Extract the ID from the path (assuming format: /cdn-cgi/imagedelivery/<account>/<id>/...)
        parts = path.split('/')
        if len(parts) >= 5:
            return parts[4]  # The image ID should be the 4th component
    except Exception as e:
        logging.error(f"Error extracting image ID from {url}: {e}")
    return None

async def get_cloudflare_metadata(session, image_id):
    """Fetch metadata from Cloudflare Images API."""
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        raise ValueError("Cloudflare credentials not set")

    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/images/v1/{image_id}"
    headers = {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                if data.get('success'):
                    metadata = data.get('result', {}).get('metadata', {})
                    return metadata
            elif response.status == 429:
                logging.warning(f"Rate limit hit for image {image_id}")
                await asyncio.sleep(5)  # Wait longer if rate limited
                return None
            else:
                logging.error(f"Error fetching metadata for image {image_id}: {response.status}")
                return None
    except Exception as e:
        logging.error(f"Exception fetching metadata for image {image_id}: {e}")
        return None

async def process_batch(session, db, batch):
    """Process a batch of image URLs."""
    tasks = []
    for image_url in batch:
        image_id = extract_image_id(image_url)
        if not image_id:
            logging.warning(f"Could not extract ID from URL: {image_url}")
            continue

        # Check if metadata already exists
        existing = await db.image_metadata.find_one({'imageId': image_id})
        if existing:
            logging.info(f"Metadata already exists for image {image_id}")
            continue

        # Create task for fetching metadata
        tasks.append(get_cloudflare_metadata(session, image_id))

    if not tasks:
        return

    results = await asyncio.gather(*tasks)
    
    # Store results in MongoDB
    for image_url, metadata in zip(batch, results):
        if metadata:
            image_id = extract_image_id(image_url)
            try:
                await db.image_metadata.insert_one({
                    'imageId': image_id,
                    **metadata,
                    'createdAt': time.time(),
                    'updatedAt': time.time()
                })
                logging.info(f"Stored metadata for image {image_id}")
            except Exception as e:
                logging.error(f"Error storing metadata for image {image_id}: {e}")

async def migrate_metadata():
    """Main migration function."""
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    
    try:
        # Get all cars with images
        cars = list(db.cars.find({'images': {'$exists': True, '$ne': []}}))
        logging.info(f"Found {len(cars)} cars with images")

        # Extract unique image URLs
        all_image_urls = list(set([
            url for car in cars 
            for url in (car.get('images', []) or [])
        ]))
        logging.info(f"Found {len(all_image_urls)} unique images")

        # Process images in batches
        async with aiohttp.ClientSession() as session:
            for i in range(0, len(all_image_urls), BATCH_SIZE):
                batch = all_image_urls[i:i + BATCH_SIZE]
                batch_num = (i // BATCH_SIZE) + 1
                total_batches = (len(all_image_urls) + BATCH_SIZE - 1) // BATCH_SIZE
                
                logging.info(f"Processing batch {batch_num} of {total_batches}")
                await process_batch(session, db, batch)

                # Add delay before next batch, but not after the last batch
                if i + BATCH_SIZE < len(all_image_urls):
                    logging.info(f"Waiting {DELAY}s before next batch...")
                    await asyncio.sleep(DELAY)

        logging.info("Migration completed successfully")

    except Exception as e:
        logging.error(f"Migration failed: {e}")
    finally:
        client.close()
        logging.info("Disconnected from MongoDB")

if __name__ == "__main__":
    asyncio.run(migrate_metadata()) 