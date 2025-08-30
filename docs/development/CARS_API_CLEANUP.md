Cars API Cleanup Summary

- Store only `imageIds` (ObjectId[]) in car documents; do not embed `images`.
- `primaryImageId` stored as ObjectId; API responses serialize IDs to strings.
- POST /api/cars normalizes incoming IDs: converts `client`, `imageIds[]`, and `primaryImageId` from strings to ObjectIds; strips embedded `images`.
- GET routes standardize image URLs using `fixCloudflareImageUrl(url)`; do not append `/public` in API responses. UI components handle Cloudflare variants.
- Added migration scripts:
  - `scripts/migrations/fix-car-image-ids.cjs` converts string IDs to ObjectIds and unsets embedded image fields.
  - `scripts/migrations/add-cars-validator.cjs` applies collection validation for core fields.

Next steps (optional):
- Split DB vs API TypeScript types across the codebase to remove `string | ObjectId` unions from UI types.
- Add input validation (Zod/Joi) on create/update handlers.
- Add indexes for common filters: `{ createdAt: -1 }`, `{ make: 1, model: 1 }`, `{ year: -1 }`, `{ client: 1 }`.

