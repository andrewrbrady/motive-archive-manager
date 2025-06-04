#!/bin/bash

# Generated commands to fix Next.js route handlers

echo "Fixing src/app/api/bat-listings/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/bat-listings/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/bat-listings/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/bat-listings/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/bat-listings/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/bat-listings/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/bat-listings/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/bat-listings/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/bat-listings/[id]/route.ts" || cat >> "src/app/api/bat-listings/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/batch-templates/[name]/route.ts"
grep -q "export const dynamic" "src/app/api/batch-templates/[name]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/batch-templates/[name]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/batch-templates/[name]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/batch-templates/[name]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/batch-templates/[name]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/batch-templates/[name]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/batch-templates/[name]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/batch-templates/[name]/route.ts" || cat >> "src/app/api/batch-templates/[name]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/article/generate/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/article/generate/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/article/generate/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/generate/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/generate/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/generate/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/generate/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/generate/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/article/generate/route.ts" || cat >> "src/app/api/cars/[id]/article/generate/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/article/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/article/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/article/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/article/route.ts" || cat >> "src/app/api/cars/[id]/article/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/article/save/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/article/save/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/article/save/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/save/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/save/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/save/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/save/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/save/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/article/save/route.ts" || cat >> "src/app/api/cars/[id]/article/save/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/article/saved/[sessionId]/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/article/saved/[sessionId]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/article/saved/[sessionId]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/saved/[sessionId]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/saved/[sessionId]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/saved/[sessionId]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/saved/[sessionId]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/saved/[sessionId]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/article/saved/[sessionId]/route.ts" || cat >> "src/app/api/cars/[id]/article/saved/[sessionId]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/article/saved/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/article/saved/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/article/saved/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/saved/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/saved/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/saved/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/saved/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/article/saved/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/article/saved/route.ts" || cat >> "src/app/api/cars/[id]/article/saved/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/deliverables/[deliverableId]/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/deliverables/[deliverableId]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/deliverables/[deliverableId]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/[deliverableId]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/[deliverableId]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/[deliverableId]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/[deliverableId]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/[deliverableId]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/deliverables/[deliverableId]/route.ts" || cat >> "src/app/api/cars/[id]/deliverables/[deliverableId]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/deliverables/assign/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/deliverables/assign/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/deliverables/assign/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/assign/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/assign/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/assign/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/assign/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/assign/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/deliverables/assign/route.ts" || cat >> "src/app/api/cars/[id]/deliverables/assign/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/deliverables/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/deliverables/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/deliverables/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/deliverables/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/deliverables/route.ts" || cat >> "src/app/api/cars/[id]/deliverables/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/documentation/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/documentation/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/documentation/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/documentation/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/documentation/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/documentation/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/documentation/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/documentation/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/documentation/route.ts" || cat >> "src/app/api/cars/[id]/documentation/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/enrich/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/enrich/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/enrich/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/enrich/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/enrich/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/enrich/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/enrich/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/enrich/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/enrich/route.ts" || cat >> "src/app/api/cars/[id]/enrich/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/events/[eventId]/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/events/[eventId]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/events/[eventId]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/events/[eventId]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/events/[eventId]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/events/[eventId]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/events/[eventId]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/events/[eventId]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/events/[eventId]/route.ts" || cat >> "src/app/api/cars/[id]/events/[eventId]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/events/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/events/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/events/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/events/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/events/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/events/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/events/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/events/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/events/route.ts" || cat >> "src/app/api/cars/[id]/events/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/research/all/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/research/all/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/research/all/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/all/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/all/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/all/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/all/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/all/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/research/all/route.ts" || cat >> "src/app/api/cars/[id]/research/all/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/research/chat/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/research/chat/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/research/chat/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/chat/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/chat/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/chat/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/chat/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/chat/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/research/chat/route.ts" || cat >> "src/app/api/cars/[id]/research/chat/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/research/content/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/research/content/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/research/content/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/content/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/content/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/content/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/content/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/content/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/research/content/route.ts" || cat >> "src/app/api/cars/[id]/research/content/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/research/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/research/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/research/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/research/route.ts" || cat >> "src/app/api/cars/[id]/research/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/research/search/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/research/search/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/research/search/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/search/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/search/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/search/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/search/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/research/search/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/research/search/route.ts" || cat >> "src/app/api/cars/[id]/research/search/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/route.ts" || cat >> "src/app/api/cars/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/scripts/all/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/scripts/all/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/scripts/all/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/all/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/all/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/all/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/all/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/all/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/scripts/all/route.ts" || cat >> "src/app/api/cars/[id]/scripts/all/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/scripts/content/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/scripts/content/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/scripts/content/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/content/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/content/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/content/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/content/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/content/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/scripts/content/route.ts" || cat >> "src/app/api/cars/[id]/scripts/content/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/scripts/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/scripts/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/scripts/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/scripts/route.ts" || cat >> "src/app/api/cars/[id]/scripts/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/scripts/upload/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/scripts/upload/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/scripts/upload/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/upload/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/upload/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/upload/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/upload/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/scripts/upload/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/scripts/upload/route.ts" || cat >> "src/app/api/cars/[id]/scripts/upload/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/shot-lists/[listId]/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/shot-lists/[listId]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/shot-lists/[listId]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shot-lists/[listId]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shot-lists/[listId]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shot-lists/[listId]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shot-lists/[listId]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shot-lists/[listId]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/shot-lists/[listId]/route.ts" || cat >> "src/app/api/cars/[id]/shot-lists/[listId]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/shot-lists/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/shot-lists/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/shot-lists/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shot-lists/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shot-lists/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shot-lists/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shot-lists/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shot-lists/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/shot-lists/route.ts" || cat >> "src/app/api/cars/[id]/shot-lists/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/shots/[shotId]/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/shots/[shotId]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/shots/[shotId]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shots/[shotId]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shots/[shotId]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shots/[shotId]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shots/[shotId]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shots/[shotId]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/shots/[shotId]/route.ts" || cat >> "src/app/api/cars/[id]/shots/[shotId]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/cars/[id]/shots/route.ts"
grep -q "export const dynamic" "src/app/api/cars/[id]/shots/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/cars/[id]/shots/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shots/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shots/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shots/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shots/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/cars/[id]/shots/route.ts"
grep -q "export async function OPTIONS" "src/app/api/cars/[id]/shots/route.ts" || cat >> "src/app/api/cars/[id]/shots/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/clients/[id]/cars/route.ts"
grep -q "export const dynamic" "src/app/api/clients/[id]/cars/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/clients/[id]/cars/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/clients/[id]/cars/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/clients/[id]/cars/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/clients/[id]/cars/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/clients/[id]/cars/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/clients/[id]/cars/route.ts"
grep -q "export async function OPTIONS" "src/app/api/clients/[id]/cars/route.ts" || cat >> "src/app/api/clients/[id]/cars/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/clients/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/clients/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/clients/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/clients/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/clients/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/clients/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/clients/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/clients/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/clients/[id]/route.ts" || cat >> "src/app/api/clients/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/contacts/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/contacts/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/contacts/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/contacts/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/contacts/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/contacts/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/contacts/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/contacts/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/contacts/[id]/route.ts" || cat >> "src/app/api/contacts/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/containers/[id]/items/route.ts"
grep -q "export const dynamic" "src/app/api/containers/[id]/items/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/containers/[id]/items/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/[id]/items/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/[id]/items/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/[id]/items/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/[id]/items/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/[id]/items/route.ts"
grep -q "export async function OPTIONS" "src/app/api/containers/[id]/items/route.ts" || cat >> "src/app/api/containers/[id]/items/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/containers/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/containers/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/containers/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/containers/[id]/route.ts" || cat >> "src/app/api/containers/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/containers/location/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/containers/location/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/containers/location/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/location/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/location/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/location/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/location/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/containers/location/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/containers/location/[id]/route.ts" || cat >> "src/app/api/containers/location/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/deliverables/[deliverableId]/route.ts"
grep -q "export const dynamic" "src/app/api/deliverables/[deliverableId]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/deliverables/[deliverableId]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/deliverables/[deliverableId]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/deliverables/[deliverableId]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/deliverables/[deliverableId]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/deliverables/[deliverableId]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/deliverables/[deliverableId]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/deliverables/[deliverableId]/route.ts" || cat >> "src/app/api/deliverables/[deliverableId]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/documents/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/documents/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/documents/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/documents/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/documents/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/documents/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/documents/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/documents/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/documents/[id]/route.ts" || cat >> "src/app/api/documents/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/event-templates/[name]/route.ts"
grep -q "export const dynamic" "src/app/api/event-templates/[name]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/event-templates/[name]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/event-templates/[name]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/event-templates/[name]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/event-templates/[name]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/event-templates/[name]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/event-templates/[name]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/event-templates/[name]/route.ts" || cat >> "src/app/api/event-templates/[name]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/hard-drives/[id]/assets/[assetId]/route.ts"
grep -q "export const dynamic" "src/app/api/hard-drives/[id]/assets/[assetId]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/hard-drives/[id]/assets/[assetId]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/assets/[assetId]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/assets/[assetId]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/assets/[assetId]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/assets/[assetId]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/assets/[assetId]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/hard-drives/[id]/assets/[assetId]/route.ts" || cat >> "src/app/api/hard-drives/[id]/assets/[assetId]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/hard-drives/[id]/raw-assets/route.ts"
grep -q "export const dynamic" "src/app/api/hard-drives/[id]/raw-assets/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/hard-drives/[id]/raw-assets/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/raw-assets/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/raw-assets/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/raw-assets/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/raw-assets/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/raw-assets/route.ts"
grep -q "export async function OPTIONS" "src/app/api/hard-drives/[id]/raw-assets/route.ts" || cat >> "src/app/api/hard-drives/[id]/raw-assets/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/hard-drives/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/hard-drives/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/hard-drives/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/hard-drives/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/hard-drives/[id]/route.ts" || cat >> "src/app/api/hard-drives/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/inventory/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/inventory/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/inventory/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/inventory/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/inventory/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/inventory/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/inventory/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/inventory/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/inventory/[id]/route.ts" || cat >> "src/app/api/inventory/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/kits/[id]/checkin/route.ts"
grep -q "export const dynamic" "src/app/api/kits/[id]/checkin/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/kits/[id]/checkin/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/checkin/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/checkin/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/checkin/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/checkin/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/checkin/route.ts"
grep -q "export async function OPTIONS" "src/app/api/kits/[id]/checkin/route.ts" || cat >> "src/app/api/kits/[id]/checkin/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/kits/[id]/checkout/route.ts"
grep -q "export const dynamic" "src/app/api/kits/[id]/checkout/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/kits/[id]/checkout/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/checkout/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/checkout/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/checkout/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/checkout/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/checkout/route.ts"
grep -q "export async function OPTIONS" "src/app/api/kits/[id]/checkout/route.ts" || cat >> "src/app/api/kits/[id]/checkout/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/kits/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/kits/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/kits/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/kits/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/kits/[id]/route.ts" || cat >> "src/app/api/kits/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/raw/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/raw/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/raw/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/raw/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/raw/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/raw/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/raw/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/raw/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/raw/[id]/route.ts" || cat >> "src/app/api/raw/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/shot-templates/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/shot-templates/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/shot-templates/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/shot-templates/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/shot-templates/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/shot-templates/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/shot-templates/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/shot-templates/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/shot-templates/[id]/route.ts" || cat >> "src/app/api/shot-templates/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/studio_inventory/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/studio_inventory/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/studio_inventory/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/studio_inventory/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/studio_inventory/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/studio_inventory/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/studio_inventory/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/studio_inventory/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/studio_inventory/[id]/route.ts" || cat >> "src/app/api/studio_inventory/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/users/[id]/roles/route.ts"
grep -q "export const dynamic" "src/app/api/users/[id]/roles/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/users/[id]/roles/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/users/[id]/roles/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/users/[id]/roles/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/users/[id]/roles/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/users/[id]/roles/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/users/[id]/roles/route.ts"
grep -q "export async function OPTIONS" "src/app/api/users/[id]/roles/route.ts" || cat >> "src/app/api/users/[id]/roles/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL
echo "Fixing src/app/api/users/[id]/route.ts"
grep -q "export const dynamic" "src/app/api/users/[id]/route.ts" || sed -i '' -e '/^import/a\
export const dynamic = "force-dynamic";
' "src/app/api/users/[id]/route.ts"
sed -i '' -e 's/export async function GET(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function GET(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/users/[id]/route.ts"
sed -i '' -e 's/export async function POST(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function POST(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/users/[id]/route.ts"
sed -i '' -e 's/export async function PUT(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PUT(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/users/[id]/route.ts"
sed -i '' -e 's/export async function PATCH(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function PATCH(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/users/[id]/route.ts"
sed -i '' -e 's/export async function DELETE(\(.*\):\(.*\), { params }: { params: {\(.*\)} })/export async function DELETE(request: Request) {\n  try {\n    const url = new URL(request.url);\n    const segments = url.pathname.split("\/");\n    // Extract params from URL path/g' "src/app/api/users/[id]/route.ts"
grep -q "export async function OPTIONS" "src/app/api/users/[id]/route.ts" || cat >> "src/app/api/users/[id]/route.ts" << 'EOL'

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
EOL

echo "Running build to verify changes..."
npm run build