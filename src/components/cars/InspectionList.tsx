"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Edit,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Inspection } from "@/types/inspection";

interface InspectionListProps {
  inspections: Inspection[];
  onView: (inspection: Inspection) => void;
  onEdit: (inspection: Inspection) => void;
  onRefresh: () => void;
}

export default function InspectionList({
  inspections,
  onView,
  onEdit,
  onRefresh,
}: InspectionListProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusIcon = (status: string) => {
    return status === "pass" ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (status: string) => {
    return status === "pass" ? (
      <Badge
        variant="secondary"
        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      >
        Pass
      </Badge>
    ) : (
      <Badge
        variant="secondary"
        className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      >
        Needs Attention
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {inspections.map((inspection) => (
        <Card
          key={inspection._id.toString()}
          className="hover:shadow-md transition-shadow"
        >
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusIcon(inspection.status)}
                  <h3 className="font-semibold text-lg">{inspection.title}</h3>
                  {getStatusBadge(inspection.status)}
                </div>
                {inspection.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {inspection.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mb-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(inspection)}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(inspection)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(inspection.inspectedAt)}
              </div>
              {inspection.inspectedBy && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {inspection.inspectedBy}
                </div>
              )}
              {inspection.inspectionImageIds &&
                inspection.inspectionImageIds.length > 0 && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {inspection.inspectionImageIds.length} image
                    {inspection.inspectionImageIds.length !== 1 ? "s" : ""}
                  </div>
                )}
              {inspection.checklistItems &&
                inspection.checklistItems.length > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    {
                      inspection.checklistItems.filter((item) => item.completed)
                        .length
                    }
                    /{inspection.checklistItems.length} items completed
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
