import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔒 GET /api/projects/[id]/budget: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log("❌ GET /api/projects/[id]/budget: Authentication failed");
    return authResult;
  }

  try {
    // Get token data and extract user ID
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

    const { id } = await params;
    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has access to this project
    const hasAccess =
      project.ownerId === userId ||
      project.members.some((member: any) => member.userId === userId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    console.log(
      "✅ GET /api/projects/[id]/budget: Successfully fetched budget"
    );
    return NextResponse.json({
      budget: project.budget,
    });
  } catch (error) {
    console.error(
      "💥 GET /api/projects/[id]/budget: Error fetching project budget:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔒 PUT /api/projects/[id]/budget: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log("❌ PUT /api/projects/[id]/budget: Authentication failed");
    return authResult;
  }

  try {
    // Get token data and extract user ID
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

    const body = await request.json();
    const { total, currency } = body;
    const { id } = await params;

    if (total !== undefined && total < 0) {
      return NextResponse.json(
        { error: "Budget total cannot be negative" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to update budget
    const canUpdateBudget =
      project.ownerId === userId ||
      project.members.some(
        (member: any) =>
          member.userId === userId && ["owner", "manager"].includes(member.role)
      );

    if (!canUpdateBudget) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update budget
    const updateData: any = {};
    if (total !== undefined) {
      updateData["budget.total"] = total;
      // Recalculate remaining budget
      const spent = project.budget?.spent || 0;
      updateData["budget.remaining"] = total - spent;
    }
    if (currency) updateData["budget.currency"] = currency;

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { error: "Failed to update budget" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Budget updated successfully",
      budget: updatedProject.budget,
    });
  } catch (error) {
    console.error("Error updating project budget:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔒 POST /api/projects/[id]/budget: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log("❌ POST /api/projects/[id]/budget: Authentication failed");
    return authResult;
  }

  try {
    // Get token data and extract user ID
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

    const body = await request.json();
    const { description, amount, category, receipt } = body;
    const { id } = await params;

    if (!description || !amount || !category) {
      return NextResponse.json(
        { error: "Description, amount, and category are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be positive" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to add expenses
    const canAddExpenses =
      project.ownerId === userId ||
      project.members.some(
        (member: any) =>
          member.userId === userId && ["owner", "manager"].includes(member.role)
      );

    if (!canAddExpenses) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create new expense
    const newExpense = {
      id: new ObjectId().toString(),
      description,
      amount,
      category,
      date: new Date(),
      receipt: receipt || undefined,
      approvedBy: userId,
    };

    // Calculate new totals
    const currentSpent = project.budget?.spent || 0;
    const newSpent = currentSpent + amount;
    const total = project.budget?.total || 0;
    const newRemaining = total - newSpent;

    // Update project with new expense and recalculated budget
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      {
        $push: { "budget.expenses": newExpense },
        $set: {
          "budget.spent": newSpent,
          "budget.remaining": newRemaining,
        },
      },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { error: "Failed to add expense" },
        { status: 500 }
      );
    }

    console.log(
      "✅ POST /api/projects/[id]/budget: Successfully added expense"
    );
    return NextResponse.json({
      message: "Expense added successfully",
      expense: newExpense,
      budget: updatedProject.budget,
    });
  } catch (error) {
    console.error(
      "💥 POST /api/projects/[id]/budget: Error adding expense:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔒 DELETE /api/projects/[id]/budget: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log("❌ DELETE /api/projects/[id]/budget: Authentication failed");
    return authResult;
  }

  try {
    // Get token data and extract user ID
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get("expenseId");
    const { id } = await params;

    if (!expenseId) {
      return NextResponse.json(
        { error: "Expense ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to remove expenses
    const canRemoveExpenses =
      project.ownerId === userId ||
      project.members.some(
        (member: any) =>
          member.userId === userId && ["owner", "manager"].includes(member.role)
      );

    if (!canRemoveExpenses) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Find the expense to get its amount before removing
    const expenseToRemove = project.budget?.expenses?.find(
      (expense: any) => expense.id === expenseId
    );
    if (!expenseToRemove) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Calculate new totals
    const currentSpent = project.budget?.spent || 0;
    const newSpent = currentSpent - expenseToRemove.amount;
    const total = project.budget?.total || 0;
    const newRemaining = total - newSpent;

    // Remove expense and update budget totals
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      {
        $pull: { "budget.expenses": { id: expenseId } },
        $set: {
          "budget.spent": newSpent,
          "budget.remaining": newRemaining,
        },
      },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { error: "Failed to remove expense" },
        { status: 500 }
      );
    }

    console.log(
      "✅ DELETE /api/projects/[id]/budget: Successfully removed expense"
    );
    return NextResponse.json({
      message: "Expense removed successfully",
      budget: updatedProject.budget,
    });
  } catch (error) {
    console.error(
      "💥 DELETE /api/projects/[id]/budget: Error removing expense:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
