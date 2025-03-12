import { NextRequest, NextResponse } from "next/server";

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
