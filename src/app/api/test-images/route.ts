import { NextRequest, NextResponse } from "next/server";

/**
 * This is a diagnostic API route used for testing API connectivity.
 * It's used to verify that API routes are accessible and working correctly
 * before attempting actual operations.
 *
 * This route is no longer used in the main application flow but is kept
 * for debugging purposes.
 */

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Test API route working!" });
}

export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json();
    return NextResponse.json({
      message: "Test DELETE route working!",
      received: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error parsing request body",
        details: error,
      },
      { status: 400 }
    );
  }
}
