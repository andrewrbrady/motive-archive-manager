import json,base64
from PIL import Image
import io

with open('test_response.json') as f:
    data = json.load(f)

if data['success']:
    img_data = base64.b64decode(data['processedImageUrl'].split(',')[1])
    img = Image.open(io.BytesIO(img_data))
    print(f'Actual result: {img.size[0]} × {img.size[1]}')
    print(f'Expected: 2160 × 2700')
    print(f'Width difference: {img.size[0] - 2160}')
    print(f'Height difference: {img.size[1] - 2700}')
else:
    print('Request failed:', data) 