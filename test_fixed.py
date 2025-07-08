import json,base64
from PIL import Image
import io

with open('fixed_test_response.json') as f:
    data = json.load(f)

if data.get('success'):
    img_data = base64.b64decode(data['processedImageUrl'].split(',')[1])
    img = Image.open(io.BytesIO(img_data))
    print(f'FIXED RESULT: {img.size[0]} × {img.size[1]}')
    print(f'Expected: 2160 × 2700')
    print(f'✅ Width correct: {img.size[0] == 2160}')
    print(f'✅ Height correct: {img.size[1] == 2700}')
    print(f'🎉 4:5 → 2x scaling: {"FIXED!" if img.size[0] == 2160 and img.size[1] == 2700 else "Still broken"}')
else:
    print('Request failed:', data) 