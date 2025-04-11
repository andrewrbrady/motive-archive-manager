# Fixing Next.js Dynamic Route Handlers

## The Problem

In Next.js 14/15, the API for route handlers with dynamic parameters has changed. The old pattern looks like this:

```typescript
// OLD PATTERN - NO LONGER WORKS
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ...
}
```

This pattern is causing type errors in the build because Next.js no longer accepts this format for the second parameter.

## The Solution

We need to replace all route handlers with the following pattern:

```typescript
// NEW PATTERN
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // Adjust index based on URL structure

    // ... rest of your code ...
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
```

## Iterative Fix Process

Since automatic scripts have proven challenging due to the complexity of the files, here's a recommended approach:

1. Run a build to find the next file with type errors:

   ```
   npm run build
   ```

2. For each file that shows an error, manually update it following these steps:

   a. Add `export const dynamic = "force-dynamic";` near the top of the file if it doesn't exist

   b. For each HTTP method handler (GET, POST, PUT, DELETE, etc.):

   ```typescript
   // OLD
   export async function METHOD(
     request: NextRequest,
     { params }: { params: { id: string } }
   ) {
     // ...
   }

   // NEW
   export async function METHOD(request: Request) {
     try {
       const url = new URL(request.url);
       const segments = url.pathname.split("/");
       const id = segments[segments.length - N]; // Adjust N based on URL structure

       // Rest of your existing code, replacing params.id with id
     } catch (error) {
       console.error("Error:", error);
       return NextResponse.json(
         {
           error:
             error instanceof Error
               ? error.message
               : "Failed to process request",
         },
         { status: 500 }
       );
     }
   }
   ```

   c. Add an OPTIONS handler if it doesn't exist

3. Run the build again to find the next file with errors

## Automated Fix with a Simple Script

Here's a simple script that you can use to fix one file at a time. This script will:

1. Update the function signature
2. Extract params from URL segments
3. Add a try/catch block
4. Add an OPTIONS handler

```javascript
#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Get file path from command line or prompt
const filepath = process.argv[2];

if (!filepath) {
  rl.question("Enter the file path to fix: ", (answer) => {
    fixFile(answer);
    rl.close();
  });
} else {
  fixFile(filepath);
  rl.close();
}

// Function to extract parameter position from URL path
function getParamPosition(filePath, paramName) {
  const segments = filePath.split("/");
  const routeIndex =
    segments.indexOf("route.ts") || segments.indexOf("route.js");

  for (let i = 0; i < segments.length; i++) {
    if (
      segments[i] === `[${paramName}]` ||
      segments[i] === `[...${paramName}]`
    ) {
      return routeIndex - i;
    }
  }

  return null;
}

function fixFile(filePath) {
  // Resolve the file path
  const fullPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  console.log(`Fixing ${fullPath}`);

  // Read the file content
  let content = fs.readFileSync(fullPath, "utf8");

  // Extract parameters from the file path
  const paramRegex = /\[([^\]]+)\]/g;
  const fileSegments = fullPath.split("/");

  const params = [];
  fileSegments.forEach((segment) => {
    let match;
    while ((match = paramRegex.exec(segment)) !== null) {
      params.push(match[1]);
    }
  });

  console.log(`Parameters found in path: ${params.join(", ")}`);

  // Add dynamic export if needed
  if (!content.includes("export const dynamic")) {
    content = content.replace(
      /import.*?;(\r?\n|\r)/,
      (match) => `${match}\nexport const dynamic = "force-dynamic";\n`
    );
    console.log("Added dynamic export");
  }

  // Replace function signatures and add try/catch
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    const methodRegex = new RegExp(
      `export\\s+async\\s+function\\s+${method}\\s*\\(\\s*(?:request|req)\\s*:\\s*(?:Request|NextRequest)\\s*,\\s*\\{\\s*params\\s*\\}:\\s*\\{\\s*params\\s*:\\s*\\{([^}]*)\\}\\s*\\}\\s*\\)\\s*\\{`
    );

    if (methodRegex.test(content)) {
      console.log(`Found ${method} handler, replacing...`);

      // Get parameter extractions
      const paramMatch = methodRegex.exec(content);
      const paramList = paramMatch ? paramMatch[1] : "";
      const paramNames = paramList
        .split(";")
        .map((p) => p.split(":")[0].trim())
        .filter((p) => p);

      const paramExtractions = paramNames
        .map((param) => {
          const position = getParamPosition(fullPath, param);
          if (position) {
            return `    const ${param} = segments[segments.length - ${position}];`;
          }
          return `    // Couldn't determine position for ${param}, adjust manually`;
        })
        .join("\n");

      // Create replacement
      const replacement =
        `export async function ${method}(request: Request) {\n` +
        `  try {\n` +
        `    const url = new URL(request.url);\n` +
        `    const segments = url.pathname.split("/");\n` +
        `${paramExtractions}\n`;

      // Replace in content
      content = content.replace(methodRegex, replacement);

      // Replace params.XXX with XXX
      for (const param of paramNames) {
        const paramsRegex = new RegExp(`params\\.${param}`, "g");
        content = content.replace(paramsRegex, param);
      }

      // Add catch block at the end of the function
      const functionEndRegex = new RegExp(
        `(return[^;]+;[^\\}]*\\})(?!\\s*catch)`,
        "g"
      );
      content = content.replace(
        functionEndRegex,
        `$1 catch (error) {\n` +
          `    console.error("Error:", error);\n` +
          `    return NextResponse.json(\n` +
          `      {\n` +
          `        error: error instanceof Error ? error.message : "Failed to process request",\n` +
          `      },\n` +
          `      { status: 500 }\n` +
          `    );\n` +
          `  }`
      );
    }
  }

  // Add OPTIONS handler if not present
  if (!content.includes("export async function OPTIONS")) {
    // Find HTTP methods used
    const methods = [];
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      if (content.includes(`export async function ${method}`)) {
        methods.push(method);
      }
    }

    if (methods.length > 0) {
      methods.push("OPTIONS");
      const methodsString = methods.join(", ");

      content += `\n\n// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "${methodsString}",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}`;
      console.log("Added OPTIONS handler");
    }
  }

  // Write the updated content back to the file
  fs.writeFileSync(fullPath, content);
  console.log(`Updated ${fullPath}`);
}
```

Save this script as `fix-route.js` in your project root and run it with:

```bash
node fix-route.js src/app/api/cars/[id]/article/generate/route.ts
```

## Example Manual Transformation

### Before:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const db = await getDatabase();
    const asset = await db.collection("raw_assets").findOne({
      _id: new ObjectId(id),
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch asset" },
      { status: 500 }
    );
  }
}
```

### After:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1]; // Adjust based on URL structure

    const db = await getDatabase();
    const asset = await db.collection("raw_assets").findOne({
      _id: new ObjectId(id),
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch asset",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
```

## Parameter Position

When extracting parameters from the URL, you need to determine the correct position in the segments array:

- For `/api/users/[id]/route.ts`: `const id = segments[segments.length - 2];`
- For `/api/cars/[id]/shots/[shotId]/route.ts`:
  - `const id = segments[segments.length - 3];`
  - `const shotId = segments[segments.length - 1];`

The position is determined by counting from the end of the URL path.

## Testing

After fixing each file or a batch of files, run:

```
npm run build
```

This will verify if your changes fixed the type errors.
