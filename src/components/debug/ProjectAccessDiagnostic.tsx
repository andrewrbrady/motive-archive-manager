"use client";

import { useState } from "react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  Users,
  Calendar,
} from "lucide-react";

interface ProjectAccessDiagnosticProps {
  projectId: string;
  error?: any;
}

export function ProjectAccessDiagnostic({
  projectId,
  error,
}: ProjectAccessDiagnosticProps) {
  const { user } = useFirebaseAuth();
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    if (!user) return;

    setIsRunning(true);
    try {
      const response = await fetch(`/api/debug/project-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          projectId,
          userId: user.uid,
        }),
      });

      const data = await response.json();
      setDiagnostics(data);
    } catch (error) {
      console.error("Failed to run diagnostics:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === true)
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (status: boolean | undefined) => {
    if (status === true)
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          Access Granted
        </Badge>
      );
    if (status === false)
      return <Badge variant="destructive">Access Denied</Badge>;
    return <Badge variant="secondary">Unknown</Badge>;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Project Access Diagnostic
        </CardTitle>
        <CardDescription>
          Diagnose why you cannot access this project. Project ID:{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
            {projectId}
          </code>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
              <XCircle className="h-4 w-4" />
              Error Details
            </div>
            <p className="text-red-700 text-sm">
              <strong>Status:</strong> {error.status} -{" "}
              {error.message || "Unknown error"}
            </p>
            {error.status === 404 && (
              <p className="text-red-700 text-sm mt-1">
                This usually means the project doesn't exist or you don't have
                access to it.
              </p>
            )}
            {error.status === 403 && (
              <p className="text-red-700 text-sm mt-1">
                You don't have permission to access this project's resources.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>
            Your User ID:{" "}
            <code className="bg-gray-100 px-1 py-0.5 rounded">
              {user?.uid || "Not authenticated"}
            </code>
          </span>
        </div>

        {!diagnostics ? (
          <Button
            onClick={runDiagnostics}
            disabled={isRunning || !user}
            className="w-full"
          >
            {isRunning
              ? "Running Diagnostics..."
              : "Run Project Access Diagnostics"}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Project Status</h3>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.projectExists)}
                    <span className="text-sm">Project Exists</span>
                  </div>
                  {getStatusBadge(diagnostics.projectExists)}
                </div>

                {diagnostics.projectExists && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(diagnostics.isOwner)}
                        <span className="text-sm">You are Owner</span>
                      </div>
                      {getStatusBadge(diagnostics.isOwner)}
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(diagnostics.isMember)}
                        <span className="text-sm">You are Member</span>
                      </div>
                      {getStatusBadge(diagnostics.isMember)}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Project Details</h3>

                {diagnostics.project && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Title:</strong> {diagnostics.project.title}
                    </div>
                    <div>
                      <strong>Owner:</strong>{" "}
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                        {diagnostics.project.ownerId}
                      </code>
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      <Badge variant="outline">
                        {diagnostics.project.status}
                      </Badge>
                    </div>
                    <div>
                      <strong>Members:</strong>{" "}
                      {diagnostics.project.members?.length || 0}
                    </div>
                    {diagnostics.project.members &&
                      diagnostics.project.members.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-600 mb-1">
                            Member List:
                          </div>
                          {diagnostics.project.members.map(
                            (member: any, index: number) => (
                              <div
                                key={index}
                                className="text-xs bg-gray-100 p-1 rounded mb-1"
                              >
                                <code>{member.userId}</code> -{" "}
                                {member.role || "No role"}
                              </div>
                            )
                          )}
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                What does this mean?
              </h4>
              <div className="text-blue-800 text-sm space-y-1">
                {!diagnostics.projectExists && (
                  <p>
                    • The project with ID {projectId} does not exist in the
                    database.
                  </p>
                )}
                {diagnostics.projectExists &&
                  !diagnostics.isOwner &&
                  !diagnostics.isMember && (
                    <>
                      <p>
                        • The project exists, but you don't have access to it.
                      </p>
                      <p>
                        • You need to be either the project owner or added as a
                        team member.
                      </p>
                      <p>
                        • Contact the project owner (
                        {diagnostics.project?.ownerId}) to request access.
                      </p>
                    </>
                  )}
                {(diagnostics.isOwner || diagnostics.isMember) && (
                  <p>
                    • You should have access to this project. The error might be
                    temporary - try refreshing the page.
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Refresh Page
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



