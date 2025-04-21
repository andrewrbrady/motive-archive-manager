# Cloudflare Images API Developer Guide

Cloudflare Images is an end-to-end image storage and delivery solution on Cloudflare’s global network ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=,of%20Images%20You%20can%20make)). It allows developers to **store images**, **transform** them (e.g. resize or crop), and **deliver** optimized variants easily via a single API. This guide covers how to use Cloudflare’s Images API for common tasks: uploading images, transforming (resizing/cropping) images, serving images to end-users, and managing images (listing, deleting, etc.). We also discuss API structure, authentication setup, best practices, and provide code examples in JavaScript and Python. All information is up-to-date as of 2025 and references official Cloudflare documentation where applicable.

## Authentication and API Setup

Before using the Images API, you need your Cloudflare **Account ID** and an **API Token** with appropriate permissions ([Getting started · Cloudflare Images docs](https://developers.cloudflare.com/images/get-started/#:~:text=Before%20you%20make%20your%20first,ID%20and%20an%20API%20token)). It’s recommended to create a scoped API Token (via Cloudflare dashboard) with at least **Images Read** and **Images Write** permissions for your Cloudflare account ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=API%20Token)). The API uses this token in a Bearer authorization header:

```
Authorization: Bearer <API_TOKEN>
```

**API Endpoint Structure:** All requests are made to the Cloudflare API base URL `https://api.cloudflare.com/client/v4/`. Cloudflare Images operations are scoped to your account and use the path:

```
/accounts/<ACCOUNT_ID>/images/v1/...
```

For example, the endpoint to upload an image is:

```
POST /accounts/<ACCOUNT_ID>/images/v1
```

([Cloudflare API | Images](https://developers.cloudflare.com/api/resources/images/#:~:text=post%2Faccounts%2F)). You can find your `<ACCOUNT_ID>` on the Cloudflare dashboard or via the API. Always include the account ID in the URL.

**Headers:** Besides the `Authorization` header, some requests require specific headers. For example, image uploads (being multipart form data) require `Content-Type: multipart/form-data`. When sending JSON (e.g. creating variants), use `Content-Type: application/json`. The API responds with JSON for all requests, including success status and results.

**Best Practice:** Use API Tokens (not your global API key) for authentication, and give them the least privileges necessary (e.g. only Images-related permissions) ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=API%20Token)). This enhances security. Keep your API token secret; never expose it in client-side code. For client-side direct uploads, use Cloudflare’s **Direct Creator Upload** feature to obtain one-time upload URLs instead ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=Direct%20creator%20upload)).

## Uploading Images

Cloudflare Images API supports uploading image files directly or importing from a URL. The upload endpoint accepts images up to **10 MB** in size ([Cloudflare API | Images](https://developers.cloudflare.com/api/resources/images/#:~:text=post%2Faccounts%2F)) and supports common image formats (PNG, GIF, JPEG, WebP, SVG) ([Upload images · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/#:~:text=You%20can%20upload%20the%20following,image%20formats%20to%20Cloudflare%20Images)) (note: HEIC/HEIF is _not_ supported ([Upload images · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/#:~:text=Note))). Images have some dimensional limits: maximum dimension 12,000 pixels, max area 100 megapixels, and metadata size up to 1024 bytes ([Upload images · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/#:~:text=These%20are%20the%20maximum%20allowed,and%20dimensions%20Cloudflare%20Images%20supports)).

**Endpoint:** `POST /accounts/<ACCOUNT_ID>/images/v1` (requires **Images Write** permission).

**Request (Multipart Form):** This is a `multipart/form-data` request. Key fields you can include in the form are:

- **`file`** – The binary image file to upload (use this when uploading from your local source).
- **`url`** – A URL of an image to fetch and upload (use this to let Cloudflare download the image from a remote source) ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=curl%20https%3A%2F%2Fapi.cloudflare.com%2Fclient%2Fv4%2Faccounts%2F%24ACCOUNT_ID%2Fimages%2Fv1%20%5C%20,F%20url%3Dhttps%3A%2F%2Fexample.com%2Fpath%2Fto%2Flogo.png)).
- **`id`** – _(Optional)_ A custom identifier for the image. If not provided, Cloudflare will generate a UUID for the image. By specifying an `id` (which can include path segments), you can define a custom name/URL path for the image ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=You%20can%20use%20a%20custom,UUID)) ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=curl%20)). **Note:** Images with custom IDs cannot be made private (signed URL access cannot be enforced on them) ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=Note)).
- **`requireSignedURLs`** – _(Optional)_ Boolean, if `true`, the uploaded image **requires a signed URL token** for access ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=,true)). This is used to protect private images (see **Serving Images** below). If false or omitted, the image is publicly accessible.
- **`metadata`** – _(Optional)_ Custom metadata as a JSON object or key-value that you can attach to the image (e.g. for your own tagging). This metadata is returned in image details and can be useful for storing application-specific info.

Only one of `file` or `url` is required in a single request (if both are provided, Cloudflare may ignore one – typically you’ll use one method at a time).

**Example – Upload via direct file (JavaScript):** The following Node.js example shows how to upload an image file using `fetch` and form-data. (Ensure you have a `fetch` implementation and `FormData` available, e.g. via Node 18+ or appropriate libraries.)

```js
const fs = require("fs");
const fetch = require("node-fetch"); // if not in Node 18+, install node-fetch
const FormData = require("form-data"); // to construct multipart form

const ACCOUNT_ID = "<YOUR_ACCOUNT_ID>";
const API_TOKEN = "<YOUR_API_TOKEN>";

const filePath = "./image.jpg";
const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`;

// Prepare form data with the image file
const form = new FormData();
form.append("file", fs.createReadStream(filePath)); // attach file stream

// Perform the POST request to upload
fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_TOKEN}`,
    // Note: form-data library sets the Content-Type (multipart boundary) automatically
  },
  body: form,
})
  .then((res) => res.json())
  .then((data) => {
    console.log("Upload response:", data);
    /*
      On success, data.result will contain image details, e.g:
      {
        id: "083eb7b2-5392-4565-b69e-aff66acddd00",
        filename: "image.jpg",
        uploaded: "2025-04-20T01:00:00Z",
        requireSignedURLs: false,
        variants: [
           "https://imagedelivery.net/<ACCOUNT_HASH>/083eb7b2-5392-4565-b69e-aff66acddd00/public"
        ]
      }
    */
  });
```

**Example – Upload via direct file (Python):** This Python example uses the `requests` library to upload an image file.

```python
import requests

ACCOUNT_ID = "<YOUR_ACCOUNT_ID>"
API_TOKEN = "<YOUR_API_TOKEN>"
file_path = "image.jpg"

url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/images/v1"
headers = {"Authorization": f"Bearer {API_TOKEN}"}

# Open the file in binary mode and send as multipart form
with open(file_path, "rb") as img:
    files = {"file": img}
    resp = requests.post(url, headers=headers, files=files)
    data = resp.json()
    print("Upload response:", data)
    # data["result"] will contain the image ID, filename, etc., similar to the structure above.
```

In these examples, a successful response (`data["success"] == true`) includes the newly uploaded image’s details. Notably, it provides an **`id`** (the image’s unique ID or custom ID path) and a list of **`variants`** (URLs for each available variant of the image) ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=)) ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=)). By default, you will at least have a **`public`** variant which represents the original image. For example, `variants[0]` might be a URL like `https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/public` that delivers the image ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=)).

**Upload via URL:** Alternatively, instead of sending the file data, you can let Cloudflare fetch the image from an existing URL. To do this, omit the `file` field and include a `url` field in the form with the image’s public URL ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=curl%20https%3A%2F%2Fapi.cloudflare.com%2Fclient%2Fv4%2Faccounts%2F%24ACCOUNT_ID%2Fimages%2Fv1%20%5C%20,F%20url%3Dhttps%3A%2F%2Fexample.com%2Fpath%2Fto%2Flogo.png)). For example, in cURL:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/images/v1" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -F url="https://example.com/path/to/image.png"
```

Cloudflare will download the image from the given URL and store it. (You can also combine this with a custom `id` by adding `-F id=<YOUR_CUSTOM_PATH>` ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=curl%20)) ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=)) if desired.) The response format is the same as a direct upload. This is useful for migrating images from an existing host.

**After Upload – Best Practices:** Once uploaded, an image is stored on Cloudflare’s infrastructure. You can start requesting it immediately via its delivery URL or via the API. If you want to restrict access to an image, set `requireSignedURLs:true` during upload – this means Cloudflare will **require a signed token** for any request for that image (discussed under **Serving Images**). Note that if you used a **custom ID**, you _cannot_ mark that image as private (signed URL enforcement is disabled for custom IDs) ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=Note)). Also consider attaching any needed metadata on upload so you can identify images later (for example, you might include a user ID or description in the `metadata`).

For applications where end-users upload images, consider using **Direct Creator Upload**: your backend can request one-time upload URLs from Cloudflare, which your frontend can use to upload images _directly to Cloudflare_ without exposing your API token ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=Direct%20creator%20upload)). This offloads image upload traffic from your server and keeps credentials safe.

## Transforming Images (Resizing & Cropping)

One of the powerful features of Cloudflare Images is the ability to dynamically transform images – for example, create thumbnails or resized versions – without having to manually process images on your server. Cloudflare allows you to define **variants** (named transformations) or use **on-the-fly transformations** to resize, crop, adjust format/quality, etc., for your stored images.

### Variants (Named Transformations)

A **variant** in Cloudflare Images is a preset that defines how an image should be transformed (resized, cropped, etc.). By default, every image has a **`public`** variant which serves the original image. You can create up to **100 custom variants** per account to suit different use cases (e.g. thumbnail, medium, large sizes) ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=Variants)). Each variant has an identifier (a name or ID) and a set of transformation options like width, height, cropping mode, etc. Once a variant is created, you can request any image in that variant by using the variant’s name in the image URL (or via the API).

You can define variants via the Cloudflare Dashboard (Images > Variants) or via the API. The API for variant management includes creating, updating, deleting, and listing variants ([Cloudflare API | Images › V2 › List Images V2](https://developers.cloudflare.com/api/resources/images/subresources/v2/methods/list/#:~:text=Create%20A%20Variant%20,variant)) ([Cloudflare API | Images › V2 › List Images V2](https://developers.cloudflare.com/api/resources/images/subresources/v2/methods/list/#:~:text=Variant%20Details%20,)). In this guide we’ll focus on creating a variant.

**Common Transformation Options:** When creating a variant, you specify an `options` object that can include fields such as:

- **`width`** and **`height`** – The target dimensions in pixels for resizing. You can specify either or both.
- **`fit`** – How to fit the image into the given width/height. Common values:
  - `"contain"` (default) – Resize to fit within the box, preserving aspect ratio (may letterbox if aspect differs).
  - `"cover"` – Fill the box exactly by resizing and cropping any overflow (preserves aspect, may crop) ([Create variants · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/create-variants/#:~:text=Contain%20The%20image%20is%20resized,cover)).
  - `"scale-down"` – Only resize _if_ the original is larger than the given size (never upscale).
  - `"crop"` – Similar to cover for oversize images (crop if needed), but will not upscale smaller images ([Create variants · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/create-variants/#:~:text=Cover%20The%20image%20is%20resized,white%20by%20default)).
  - `"pad"` – Like contain, but pads the extra space with a background color.
- **`gravity`** – When using `"cover"` or `"crop"`, you can set a focal point for cropping. For example, `"gravity":"center"` (default), or specific focus like `"gravity":"face"` to center on a face (Cloudflare also offers smart detection for faces/important content in beta).
- **`quality`** – JPEG/WEBP quality (percentage) or `"auto"` for dynamic quality. Cloudflare also has a concept of _Premium_ automatic quality if enabled.
- **`format`** – To force an output format like `"png"`, `"jpg"`, or `"auto"` to let Cloudflare decide the best format (usually you won't need to set this manually, as Cloudflare auto-selects WebP/AVIF when possible – see **Serving Images**).
- **`metadata`** – How to handle metadata (EXIF) in the output. `"keep"` or `"none"` are typical (default is none, to save size) ([Create variants · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/create-variants/#:~:text=)).
- **Other options:** There are many additional transformations (rotate, blur, sharpen, brightness, contrast, etc.) available as part of Cloudflare’s image processing engine ([Transform via URL · Cloudflare Images docs](https://developers.cloudflare.com/images/transform-images/transform-via-url/#:~:text=)) ([Transform via URL · Cloudflare Images docs](https://developers.cloudflare.com/images/transform-images/transform-via-url/#:~:text=%2A%20A%20comma,IMAGE)). These can be set when creating variants or via URL parameters. Refer to Cloudflare’s documentation for a full list of image options.

**Creating a Variant via API:** To create a new variant, use:

```
POST /accounts/<ACCOUNT_ID>/images/v1/variants
```

with a JSON body defining the variant. You must provide a unique `id` (name) for the variant and the `options` for the transformations ([Create variants · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/create-variants/#:~:text=Terminal%20window)). For example, suppose we want to create a **thumbnail** variant that resizes images to 150×150 pixels and crops to fill (cover):

**Example – Create variant (JavaScript):**

```js
const fetch = require("node-fetch");

const ACCOUNT_ID = "<YOUR_ACCOUNT_ID>";
const API_TOKEN = "<YOUR_API_TOKEN>";
const variantName = "thumbnail";
const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1/variants`;

const variantDefinition = {
  id: variantName,
  options: {
    width: 150,
    height: 150,
    fit: "cover",
    metadata: "none",
  },
  neverRequireSignedURLs: true, // allow this variant to be accessed without a signed token even if the image is private
};

fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(variantDefinition),
})
  .then((res) => res.json())
  .then((data) => {
    if (data.success) {
      console.log(`Variant '${variantName}' created successfully.`);
    } else {
      console.error("Failed to create variant:", data.errors);
    }
  });
```

**Example – Create variant (Python):**

```python
import requests
import json

ACCOUNT_ID = "<YOUR_ACCOUNT_ID>"
API_TOKEN = "<YOUR_API_TOKEN>"
variant_name = "thumbnail"
url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/images/v1/variants"

variant_def = {
    "id": variant_name,
    "options": {
        "width": 150,
        "height": 150,
        "fit": "cover",
        "metadata": "none"
    },
    "neverRequireSignedURLs": True
}

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}
resp = requests.post(url, headers=headers, json=variant_def)
data = resp.json()
if data.get("success"):
    print(f"Variant '{variant_name}' created.")
else:
    print("Error creating variant:", data.get("errors"))
```

In the above JSON, we set `neverRequireSignedURLs: true` to ensure this variant can be viewed publicly even if the base image is marked as requiring signed URLs (this field is optional; if your images are all public or you want to enforce signing on all variants, you may omit or set it false) ([Create variants · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/create-variants/#:~:text=)). After creation, the new variant will appear in your account’s variant list. If you have existing images, you can immediately request them with this variant.

Once a variant is defined, **using it is simple** – you just replace the variant name in the image’s URL to get that transformation (more on this in **Serving Images** below). If you update or delete a variant via API, Cloudflare will automatically purge cached images that used that variant ([Cloudflare API | Images › V2 › List Images V2](https://developers.cloudflare.com/api/resources/images/subresources/v2/methods/list/#:~:text=Delete%20A%20Variant%20,string)) ([Cloudflare API | Images › V2 › List Images V2](https://developers.cloudflare.com/api/resources/images/subresources/v2/methods/list/#:~:text=delete%2Faccounts%2F)) (this ensures that changes to variant definitions take effect immediately).

### On-Demand Transformations (Flexible Variants)

Instead of creating named variants for every size, Cloudflare also offers **Flexible Variants**, which let you request arbitrary transformations directly in the URL, without pre-defining a variant. This feature must be enabled on your account (via the Images settings in your Cloudflare dashboard) ([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=To%20serve%20images%20uploaded%20to,Cloudflare%20Images%2C%20you%20must%20have)). Once **Flexible Variants** are enabled, the `VARIANT_NAME` part of an image URL (see next section) can be replaced with a comma-separated list of transformation parameters.

For example, without a predefined variant, you could request an image with specific dimensions like:

```
https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/width=400,height=300
```

If flexible variants are enabled, Cloudflare will interpret `width=400,height=300` as a transformation instruction to resize that image on the fly to 400×300 pixels. You can combine multiple params (e.g. `width=400,height=300,fit=cover` to crop, or add `format=auto` etc.). Parameters and syntax largely mirror those used in Cloudflare’s standard Image Resizing URLs ([Transform via URL · Cloudflare Images docs](https://developers.cloudflare.com/images/transform-images/transform-via-url/#:~:text=)) ([Transform via URL · Cloudflare Images docs](https://developers.cloudflare.com/images/transform-images/transform-via-url/#:~:text=%2A%20A%20comma,IMAGE)).

**Example:** After enabling flexible variants, the following URL...

```
https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/w=400,sharpen=3
```

...would produce the image resized to width 400px with a sharpening filter applied ([Image Trasform via URL not working for images stored in Cloudflare ...](https://community.cloudflare.com/t/image-trasform-via-url-not-working-for-images-stored-in-cloudflare-image-stream/616760#:~:text=,IMAGE_ID%3E%2Fw%3D400%2Csharpen%3D3%20or)). (Short parameter names like `w` for width are accepted in this context.) In general, however, using full names (e.g. `width=`) is clearer, as in `.../width=400,sharpen=3`.

**Important considerations:** Flexible variants are very powerful for ad-hoc image resizing, but use them carefully:

- You should still restrict who can use your image URLs. If your images are public, anyone can request any size. If an image is meant to be private (requiring a signed URL), flexible variants might not be allowed or could expose the original if not configured properly. (At the time of writing, Cloudflare does **not support flexible variants on images that require signed URLs** – private images must use named variants or be accessed with a token for security ([Cloudflare Images flexible variants security](https://community.cloudflare.com/t/cloudflare-images-flexible-variants-security/408946#:~:text=Cloudflare%20Images%20flexible%20variants%20security,2%2C%20884)).)
- Every unique transformation (unique set of parameters) counts as a separate variant for billing purposes, but Cloudflare will **only bill each unique transformation once per 30 days** ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=Image%20Resizing%20is%20now%20available,as%20transformations)). This means you won’t be repeatedly charged for the same resize parameters on the same image within that period.
- For commonly used sizes, it’s still beneficial to create named variants. Named variants provide predictable URLs and can be easier to manage (and secure, since you can selectively allow public access per variant with the `neverRequireSignedURLs` flag).

## Serving Images

After uploading images (and optionally defining variants), you can serve them to users through a **dedicated delivery URL**. Cloudflare stores and serves images via a high-performance CDN, automatically optimizing format and caching images at the edge.

**Image Delivery URL Structure:** An image URL (using Cloudflare’s default domain) has the format:

```
https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT_NAME>
```

([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=A%20typical%20image%20delivery%20URL,similar%20to%20the%20example%20below)). Here:

- `<ACCOUNT_HASH>` is a unique identifier for your Cloudflare Images account (distinct from your Account ID). You can find this hash in the Cloudflare dashboard under **Images > Developer Resources** ([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=Assuming%20you%20have%20at%20least,Images%20dashboard%20under%20Developer%20Resources)).
- `<IMAGE_ID>` is the ID of the image (the UUID returned on upload, or your custom ID/path if you provided one ([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=,is%20the%20variant%20name))).
- `<VARIANT_NAME>` is the name of the variant you want to serve. Use `"public"` for the original image or any custom variant name (e.g. `"thumbnail"` from the earlier example). If flexible variants are enabled, this can instead be a set of parameters like `width=...` as described above.

For example, using the values from an earlier example:

```
https://imagedelivery.net/ZWd9g1K7eljCn_KDTu_MWA/083eb7b2-5392-4565-b69e-aff66acddd00/public
```

In this URL:

- `ZWd9g1K7eljCn_KDTu_MWA` is the account hash.
- `083eb7b2-5392-4565-b69e-aff66acddd00` is the image ID.
- `public` is the variant (serving the original image) ([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=,is%20the%20variant%20name)).

If we wanted the `"thumbnail"` variant of that image, the URL would be:

```
https://imagedelivery.net/ZWd9g1K7eljCn_KDTu_MWA/083eb7b2-5392-4565-b69e-aff66acddd00/thumbnail
```

**Using Custom Domains:** By default, Cloudflare serves your images from the `imagedelivery.net` domain and the `/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT>` path. You can also serve images through your own domain if it’s on Cloudflare (this uses a special path prefix `/_cdn-cgi/imagedelivery/`). For example:

```
https://your-domain.com/cdn-cgi/imagedelivery/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT>
```

will also deliver the image ([Serve images from custom domains · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-from-custom-domains/#:~:text=Image%20delivery%20is%20supported%20from,adjusted%20to%20the%20following%20format)) ([Serve images from custom domains · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-from-custom-domains/#:~:text=https%3A%2F%2Fexample.com%2Fcdn)), as long as `your-domain.com` is a Cloudflare zone under the same account. You may need to configure a Transform Rule to rewrite friendly URLs to this pattern ([Serve images from custom domains · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-from-custom-domains/#:~:text=Custom%20paths)) ([Serve images from custom domains · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-from-custom-domains/#:~:text=This%20example%20lets%20you%20rewrite,cgi%2Fimagedelivery%2F%3CACCOUNT_HASH)). Using a custom domain allows the image URLs to match your site’s domain. (This is optional; many developers simply use the `imagedelivery.net` links provided.)

**Automatic Format Optimization:** Cloudflare automatically serves images in the most efficient format supported by the client. When a user requests an image (especially with variant transformations), Cloudflare will detect the client’s supported formats (e.g. AVIF, WebP) and convert on the fly. For example, if a user’s browser supports AVIF, Cloudflare might deliver an AVIF image even if the stored image is JPEG ([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=Cloudflare%20Images%20automatically%20transcodes%20uploaded,files%20in%20the%20original%20format)). If AVIF isn’t supported but WebP is, it will use WebP; otherwise it falls back to the original format. This content negotiation is transparent – you don’t need to specify `format=auto` because Cloudflare does this by default for images in the Images service. (If you **do** want to force a certain format, you can include that in the variant options or URL parameters.)

**Caching:** Cloudflare Images are cached on Cloudflare’s edge. The first request for a given image variant may be a bit slower (cache miss), but subsequent requests (from the same or nearby regions) will be served quickly from cache. Cloudflare ensures that when you update or delete an image or variant, the caches are purged so stale content isn’t served ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=Delete%20Image%20,string)) ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=Image)). You can control Browser Cache TTL for images via settings if needed (the default is often reasonable) ([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=,29)) ([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=,41)).

**Private Images (Signed URLs):** If an image was uploaded with `requireSignedURLs=true`, it will not be accessible via the direct URL unless a valid signature token is appended. Cloudflare uses a JWT-based signing mechanism to authorize image requests ([Serve private images - Cloudflare Docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-private-images/#:~:text=Serve%20private%20images%20,to%20always%20allow%20public%20access)). To serve such an image, you must generate a signed URL (or use Cloudflare’s SDKs) with a token that grants access. Detailing the signed URL generation is beyond this guide, but in short, you’d create a token with your account’s signing key and include it as a query parameter (for example, `...?token=<signature>`). If you have a variant marked with `neverRequireSignedURLs:true`, that particular variant can be accessed without a token even if the base image is otherwise private ([Create variants · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/create-variants/#:~:text=)). See Cloudflare’s **Serve private images** documentation for implementation details ([Serve private images - Cloudflare Docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-private-images/#:~:text=Serve%20private%20images%20,to%20always%20allow%20public%20access)).

**Using Images in your App:** To display an image in a web page, you can simply use the URL in an `<img>` tag or CSS. For example:

```html
<img
  src="https://imagedelivery.net/ZWd9g1K7eljCn_KDTu_MWA/083eb7b2-4565-b69e-aff66acddd00/thumbnail"
  alt="Thumbnail"
  width="150"
  height="150"
/>
```

If you need to fetch image data in your application (server-side), you can do so with any HTTP client since the images are served over HTTPS.

**Example – Fetch an image via URL (JavaScript):** Here’s how you might retrieve an image using Node.js (useful if you need to download or process the image server-side):

```js
const fetch = require("node-fetch");
const fs = require("fs");

const ACCOUNT_HASH = "<YOUR_IMAGES_ACCOUNT_HASH>";
const imageId = "<IMAGE_ID>";
const variant = "public"; // or custom variant name

const url = `https://imagedelivery.net/${ACCOUNT_HASH}/${imageId}/${variant}`;
fetch(url)
  .then((res) => {
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
    return res.buffer(); // get raw image bytes
  })
  .then((buffer) => {
    console.log(`Downloaded image, size: ${buffer.length} bytes`);
    fs.writeFileSync("output_image", buffer);
  })
  .catch((err) => {
    console.error(err);
  });
```

**Example – Fetch an image via URL (Python):**

```python
import requests

ACCOUNT_HASH = "<YOUR_IMAGES_ACCOUNT_HASH>"
image_id = "<IMAGE_ID>"
variant = "public"

url = f"https://imagedelivery.net/{ACCOUNT_HASH}/{image_id}/{variant}"
resp = requests.get(url)
if resp.status_code == 200:
    img_bytes = resp.content
    print(f"Image downloaded, {len(img_bytes)} bytes")
    with open("output_image", "wb") as f:
        f.write(img_bytes)
else:
    print("Failed to fetch image:", resp.status_code, resp.text)
```

In these examples, we simply GET the image URL and write the content to a file. In a real application, you would usually just serve the `url` to clients (letting them fetch the image), rather than your server downloading it. But this demonstrates that the image URL is accessible with a standard HTTP GET. Remember, if the image requires a signed URL, you would need to append the `token` parameter to the URL before fetching.

**Tip:** You can test an image URL in a browser or with tools like `curl` to ensure it’s delivering the expected variant. Cloudflare’s response will include appropriate content type headers (e.g. `Content-Type: image/webp` if it converted the image to WebP for your browser). Cloudflare will also automatically compress images and strip metadata depending on your variant settings to optimize delivery.

## Managing Images (Listing, Details, Deletion)

Cloudflare’s API provides endpoints to list your stored images, get details for a specific image, update image settings, and delete images. These management operations help you integrate image workflows or maintenance tasks into your application (for example, showing a gallery of uploaded images, or removing an image when a user deletes it).

### Listing Images

**Endpoint:** `GET /accounts/<ACCOUNT_ID>/images/v1` – returns a paginated list of images in your account ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=List%20Images%20,)). By default it returns up to 100 images per page ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=List%20Images%20,)). You can use query parameters for pagination such as `page` and `per_page` (or a `cursor` in newer versions). The response JSON includes an array of images under `result.images` and may include a `result_info` with pagination data.

Cloudflare has also introduced a **V2 listing** endpoint: `GET /accounts/<ACCOUNT_ID>/images/v2` which can return up to 10,000 images in one call and uses a `continuation_token` for pagination ([Cloudflare API | Images › V2 › List Images V2](https://developers.cloudflare.com/api/resources/images/subresources/v2/methods/list/#:~:text=List%20Images%20V2%20,continuation_token%2C%20images)) ([Cloudflare API | Images › V2 › List Images V2](https://developers.cloudflare.com/api/resources/images/subresources/v2/methods/list/#:~:text=continuation_token%3A%20string)). This is useful if you have a large image library. The usage is similar, except you might specify `per_page` (max 10000) and check for a `continuation_token` in the response to fetch subsequent pages.

Each image entry in the list contains details such as its `id`, `filename`, upload timestamp, `requireSignedURLs` setting, and possibly a list of variant URLs or metadata ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=)) ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=)). (The exact fields may vary; refer to Cloudflare’s API docs for the image object schema.)

**Example – List images (JavaScript):**

```js
const fetch = require("node-fetch");

const ACCOUNT_ID = "<YOUR_ACCOUNT_ID>";
const API_TOKEN = "<YOUR_API_TOKEN>";
const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1?page=1&per_page=100`;

fetch(url, {
  method: "GET",
  headers: { Authorization: `Bearer ${API_TOKEN}` },
})
  .then((res) => res.json())
  .then((data) => {
    if (data.success) {
      const images = data.result.images;
      console.log(`Retrieved ${images.length} images (page 1).`);
      images.forEach((img) => {
        console.log(
          `- ID: ${img.id}, Filename: ${img.filename}, Uploaded: ${img.uploaded}`
        );
      });
    } else {
      console.error("Failed to list images:", data.errors);
    }
  });
```

**Example – List images (Python):**

```python
import requests

ACCOUNT_ID = "<YOUR_ACCOUNT_ID>"
API_TOKEN = "<YOUR_API_TOKEN>"
url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/images/v1?page=1&per_page=100"

resp = requests.get(url, headers={"Authorization": f"Bearer {API_TOKEN}"})
data = resp.json()
if data.get("success"):
    images = data["result"]["images"]
    print(f"Retrieved {len(images)} images:")
    for img in images:
        print(f" - ID: {img['id']}, Filename: {img['filename']}, Uploaded: {img['uploaded']}")
else:
    print("Error listing images:", data.get("errors"))
```

These examples fetch the first page of images (up to 100). If you have more images, the response may include `result_info` with `total_pages` or a continuation cursor. You would then iterate pages (or use the v2 API with `continuation_token`) to retrieve all images. Use filters or search parameters (if provided by API) as needed to narrow results.

### Getting Image Details

If you want detailed information for a single image (including its variants URLs, metadata, etc.), you can call:

**Endpoint:** `GET /accounts/<ACCOUNT_ID>/images/v1/<IMAGE_ID>` – retrieves information on that specific image ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=Image%20Details%20)). This returns similar data as in the upload response (id, filename, upload date, metadata, variants array, requireSignedURLs flag, etc.). Use this to refresh or display details for one image without listing all.

Example:

```bash
curl -X GET "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/images/v1/<IMAGE_ID>" \
     -H "Authorization: Bearer <API_TOKEN>"
```

This would output a JSON with the image’s details if the ID is found. (Code example omitted for brevity, as it's a simple GET similar to listing.)

### Deleting Images

To delete an image from Cloudflare Images (e.g. if a user removes their profile picture or you want to free up storage):

**Endpoint:** `DELETE /accounts/<ACCOUNT_ID>/images/v1/<IMAGE_ID>` – deletes the specified image ([Cloudflare API | Images](https://developers.cloudflare.com/api/resources/images/#:~:text=Delete%20Image%20,string)). A successful deletion will remove the image from storage and purge it from all CDN caches ([Cloudflare API | Images](https://developers.cloudflare.com/api/resources/images/#:~:text=Delete%20an%20image%20on%20Cloudflare,deleted%20and%20purged%20from%20cache)), meaning it will no longer be accessible via its URL. (If someone tries to fetch it after deletion, they’ll get a 404 Not Found or a specific Cloudflare error code.)

**Example – Delete image (JavaScript):**

```js
const imageIdToDelete = "<IMAGE_ID_TO_DELETE>";
const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1/${imageIdToDelete}`;

fetch(url, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${API_TOKEN}` },
})
  .then((res) => res.json())
  .then((data) => {
    if (data.success) {
      console.log(`Image ${imageIdToDelete} deleted successfully.`);
    } else {
      console.error("Failed to delete image:", data.errors);
    }
  });
```

**Example – Delete image (Python):**

```python
image_id_to_delete = "<IMAGE_ID_TO_DELETE>"
url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/images/v1/{image_id_to_delete}"

resp = requests.delete(url, headers={"Authorization": f"Bearer {API_TOKEN}"})
data = resp.json()
if data.get("success"):
    print(f"Image {image_id_to_delete} deleted.")
else:
    print("Error deleting image:", data.get("errors"))
```

If deletion is successful, the API responds with `success: true` (and typically an empty `result` or a confirmation message). After this, any attempt to access the image URL will fail. **Note:** Deletion is permanent. If the image was important, make sure you have a backup outside Cloudflare if needed, as Cloudflare will not retain it. Also, deletion will invalidate any variants of that image cached on the CDN ([Cloudflare API | Images](https://developers.cloudflare.com/api/resources/images/#:~:text=Delete%20an%20image%20on%20Cloudflare,deleted%20and%20purged%20from%20cache)), so you don’t need to manually purge.

### Updating Images

Cloudflare also allows some updates to an image’s settings via:

**Endpoint:** `PATCH /accounts/<ACCOUNT_ID>/images/v1/<IMAGE_ID>` – this is currently used for updating the image’s access control (specifically, toggling the `requireSignedURLs` setting after upload) ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=Update%20Image%20)). For example, you could switch an image from public to private or vice versa. When you change this setting, Cloudflare will purge cached copies of the image (and its variants) to enforce the new access rule immediately ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=Image)). The request body would be JSON like `{"requireSignedURLs": true}` (or false). Other updatable fields might include metadata in the future, but as of the latest docs, access control is the main use.

If your use case requires it, you can also manage **signing keys** (for signed URLs) via the API, and retrieve **usage statistics** for Cloudflare Images (e.g. count of images, storage used) via `GET /images/v1/stats` ([Cloudflare API | Images › V2 › List Images V2](https://developers.cloudflare.com/api/resources/images/subresources/v2/methods/list/#:~:text=Images%20Usage%20Statistics%20)). Those are more advanced topics; see Cloudflare’s API reference if needed.

## Conclusion and Best Practices

Cloudflare Images provides a robust API to handle image storage, transformation, and delivery. To recap:

- **Uploading**: Use the Images API to upload images either directly or from URLs. Remember the size/format limits (e.g. 10 MB, max 12k×12k pixels) ([Cloudflare API | Images](https://developers.cloudflare.com/api/resources/images/#:~:text=post%2Faccounts%2F)) ([Upload images · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/#:~:text=These%20are%20the%20maximum%20allowed,and%20dimensions%20Cloudflare%20Images%20supports)). Set `requireSignedURLs` for images that should be protected ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=,true)). Consider using custom IDs for human-readable paths (though keep in mind those images can’t be private) ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=Note)). Leverage Direct Creator Upload for user-submitted content for efficiency and security ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=Direct%20creator%20upload)).

- **Transforming**: Define **variants** to efficiently resize or crop images for your needs (up to 100 variants) ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=Variants)). Common transformations like width, height, and fit can produce thumbnails, avatars, etc. Creating named variants for frequently used sizes is recommended. For more dynamic requirements, enable **flexible variants** to use on-the-fly URL parameters for transformation (noting the caveats for private images). Cloudflare will optimize image formats automatically and only charge for unique transformations once per 30 days ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=Image%20Resizing%20is%20now%20available,as%20transformations)).

- **Serving**: Use the `imagedelivery.net` URLs (with your account hash) or your own domain’s `/cdn-cgi/imagedelivery/` path ([Serve images from custom domains · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-from-custom-domains/#:~:text=https%3A%2F%2Fexample.com%2Fcdn)) to serve images. Include the desired variant name in the URL to get that transformed version ([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=A%20typical%20image%20delivery%20URL,similar%20to%20the%20example%20below)). Cloudflare’s network will cache and rapidly deliver images to users, negotiating the best format (AVIF/WebP) based on the client ([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=Cloudflare%20Images%20automatically%20transcodes%20uploaded,files%20in%20the%20original%20format)). For private images, generate signed URLs and respect token expiration to secure access ([Serve private images - Cloudflare Docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-private-images/#:~:text=Serve%20private%20images%20,to%20always%20allow%20public%20access)).

- **Managing**: Use listing and detail endpoints to keep track of stored images and their metadata. Clean up images by calling delete when they’re no longer needed – this frees storage and ensures they aren’t accessible ([Cloudflare API | Images](https://developers.cloudflare.com/api/resources/images/#:~:text=Delete%20an%20image%20on%20Cloudflare,deleted%20and%20purged%20from%20cache)). Any changes (delete or updating access) will purge cache automatically, but if needed you can also manually purge via Cloudflare cache APIs (not usually necessary for Images, since the service handles it).

By following this guide and using the official Cloudflare Images API, developers can build a powerful, scalable image pipeline – uploading user content, generating responsive variants, and delivering them globally with minimal effort. Always refer to Cloudflare’s official documentation for the latest details and expanded features of the Images API ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=Cloudflare%20Images%20provides%20an%20end,on%20Cloudflare%27s%20global%20network%20%E2%86%97)) ([Transform images · Cloudflare Images docs](https://developers.cloudflare.com/images/transform-images/#:~:text=Transformations%20let%20you%20optimize%20and,of%20your%20zones%20on%20Cloudflare)), as the platform continues to evolve. Happy building with Cloudflare Images!

**Sources:**

- Cloudflare Images Overview ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=Cloudflare%20Images%20provides%20an%20end,on%20Cloudflare%27s%20global%20network%20%E2%86%97)) ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=,available%20image%20on%20the%20Internet))
- Cloudflare Images API Reference – Uploading Images ([Cloudflare API | Images](https://developers.cloudflare.com/api/resources/images/#:~:text=post%2Faccounts%2F)) ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=post%2Faccounts%2F))
- Cloudflare Images documentation – Supported formats and limits ([Upload images · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/#:~:text=You%20can%20upload%20the%20following,image%20formats%20to%20Cloudflare%20Images)) ([Upload images · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/#:~:text=These%20are%20the%20maximum%20allowed,and%20dimensions%20Cloudflare%20Images%20supports))
- Cloudflare Images API Reference – Custom ID (upload via custom path) ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=Note)) ([Upload via custom path · Cloudflare Images docs](https://developers.cloudflare.com/images/upload-images/upload-custom-path/#:~:text=))
- Cloudflare Images API Reference – Variant creation and options ([Create variants · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/create-variants/#:~:text=Terminal%20window)) ([Create variants · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/create-variants/#:~:text=Contain%20The%20image%20is%20resized,cover))
- Cloudflare Images docs – Variants and transformation concepts ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=Variants)) ([Transform images · Cloudflare Images docs](https://developers.cloudflare.com/images/transform-images/#:~:text=As%20such%2C%20Cloudflare%20Images%20variants,you%20want%20to%20serve%20them))
- Cloudflare Images docs – Serving images (imagedelivery URL format) ([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=A%20typical%20image%20delivery%20URL,similar%20to%20the%20example%20below)) ([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=,is%20the%20variant%20name))
- Cloudflare Images docs – Automatic format optimization ([Serve uploaded images · Cloudflare Images docs](https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/#:~:text=Cloudflare%20Images%20automatically%20transcodes%20uploaded,files%20in%20the%20original%20format))
- Cloudflare API Reference – Listing and deleting images ([Cloudflare API | Images › V1 › Upload An Image](https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/#:~:text=List%20Images%20,)) ([Cloudflare API | Images](https://developers.cloudflare.com/api/resources/images/#:~:text=Delete%20an%20image%20on%20Cloudflare,deleted%20and%20purged%20from%20cache))
- Cloudflare Images docs – Billing for transformations ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=Image%20Resizing%20is%20now%20available,as%20transformations)) and Direct Creator Upload feature ([Overview · Cloudflare Images docs](https://developers.cloudflare.com/images/#:~:text=Direct%20creator%20upload)).
