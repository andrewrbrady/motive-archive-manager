"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Edit,
  Mail,
  Trash2,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  FileText,
  Send,
  Loader2,
} from "lucide-react";
import { Inspection } from "@/types/inspection";
import { toast } from "sonner";
import { useAPI } from "@/hooks/useAPI";
import { LoadingSpinner } from "@/components/ui/loading";

interface InspectionReportProps {
  inspection: Inspection;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
}

export default function InspectionReport({
  inspection,
  onEdit,
  onBack,
  onDelete,
}: InspectionReportProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteImages, setDeleteImages] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: `Inspection Report - ${inspection.title}`,
    includeImages: true,
    message: "",
  });

  const api = useAPI();

  if (!api) {
    return <LoadingSpinner />;
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    return status === "pass" ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Pass
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Needs Attention
      </Badge>
    );
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);

    toast.success("Deleting inspection in background...");
    setShowDeleteDialog(false);

    const deleteOperation = () => {
      api
        .deleteWithBody(`inspections/${inspection._id}`, { deleteImages })
        .then((result: any) => {
          let message = "Inspection deleted successfully";
          if (
            deleteImages &&
            result.imagesDeleted &&
            result.imagesDeleted > 0
          ) {
            message += ` and ${result.imagesDeleted} image(s) removed from storage`;
          }

          toast.success(message);
          onDelete();
        })
        .catch((error: any) => {
          console.error("Error deleting inspection:", error);
          toast.error(error?.message || "Failed to delete inspection");
          setShowDeleteDialog(true);
        })
        .finally(() => {
          setIsDeleting(false);
          setDeleteImages(false);
        });
    };

    setTimeout(deleteOperation, 0);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDeleteImages(false);
  };

  const handleSendEmail = async () => {
    if (!emailForm.to.trim()) {
      toast.error("Recipient email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForm.to)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSendingEmail(true);

    toast.success("Sending inspection report in background...");
    setShowEmailModal(false);

    const currentEmailForm = { ...emailForm };

    setEmailForm({
      to: "",
      subject: `Inspection Report - ${inspection.title}`,
      includeImages: true,
      message: "",
    });

    const emailOperation = () => {
      api
        .post(`inspections/${inspection._id}/email`, currentEmailForm)
        .then(() => {
          toast.success("Inspection report sent successfully!");
        })
        .catch((error: any) => {
          console.error("Error sending email:", error);
          toast.error(error?.message || "Failed to send email");
          setShowEmailModal(true);
          setEmailForm({
            to: currentEmailForm.to,
            subject: currentEmailForm.subject,
            includeImages: currentEmailForm.includeImages,
            message: currentEmailForm.message,
          });
        })
        .finally(() => {
          setIsSendingEmail(false);
        });
    };

    setTimeout(emailOperation, 0);
  };

  const handleEmailFormChange = (field: string, value: any) => {
    setEmailForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Inspection Report
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              View inspection details and findings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailModal(true)}
            className="flex-1 sm:flex-none"
          >
            <Mail className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Send Report</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1 sm:flex-none"
          >
            <Edit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="flex-1 sm:flex-none"
          >
            {isDeleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Card className="border-0">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl">
                {inspection.title}
              </CardTitle>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-muted-foreground">
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
              </div>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge(inspection.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 mt-4">
          {inspection.description && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <div className="max-w-4xl max-h-96 overflow-y-auto bg-muted/30 rounded-lg border p-4">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {inspection.description}
                </p>
              </div>
            </div>
          )}

          {inspection.checklistItems &&
            inspection.checklistItems.length > 0 && (
              <div>
                <h3 className="font-semibold mb-4">Inspection Checklist</h3>
                <div className="space-y-2">
                  {inspection.checklistItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                    >
                      <div
                        className={`mt-0.5 flex-shrink-0 ${item.completed ? "text-green-600" : "text-red-600"}`}
                      >
                        {item.completed ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={
                            item.completed
                              ? "text-muted-foreground line-through"
                              : ""
                          }
                        >
                          {item.description}
                        </p>
                        {item.completed && item.dateCompleted && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Completed: {formatDate(item.dateCompleted)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {inspection.inspectionImageIds &&
            inspection.inspectionImageIds.length > 0 && (
              <div>
                <h3 className="font-semibold mb-4">Inspection Images</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {inspection.inspectionImageIds.map((imageId) => (
                    <div
                      key={imageId}
                      className="relative rounded-lg overflow-hidden"
                    >
                      <img
                        src={`https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/${imageId}/w=400,q=85`}
                        alt="Inspection image"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

          {(inspection.dropboxVideoFolderUrl ||
            inspection.dropboxImageFolderUrl) && (
            <div>
              <h3 className="font-semibold mb-4">External Media</h3>
              <div className="space-y-2">
                {inspection.dropboxVideoFolderUrl && (
                  <div className="flex items-center gap-2 break-all">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={inspection.dropboxVideoFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Video Folder (Dropbox)
                    </a>
                  </div>
                )}
                {inspection.dropboxImageFolderUrl && (
                  <div className="flex items-center gap-2 break-all">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={inspection.dropboxImageFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Image Folder (Dropbox)
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Inspection Report</DialogTitle>
            <DialogDescription>
              Send this inspection report via email to a recipient.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipient Email *</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="recipient@example.com"
                value={emailForm.to}
                onChange={(e) => handleEmailFormChange("to", e.target.value)}
                disabled={isSendingEmail}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                placeholder="Email subject line"
                value={emailForm.subject}
                onChange={(e) =>
                  handleEmailFormChange("subject", e.target.value)
                }
                disabled={isSendingEmail}
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="include-images"
                checked={emailForm.includeImages}
                onCheckedChange={(checked) =>
                  handleEmailFormChange("includeImages", checked)
                }
                disabled={isSendingEmail}
                className="mt-0.5"
              />
              <Label
                htmlFor="include-images"
                className="text-sm font-normal leading-relaxed"
              >
                Include inspection images in email
                {inspection.inspectionImageIds?.length > 0 && (
                  <span className="text-muted-foreground ml-1">
                    ({inspection.inspectionImageIds.length} images)
                  </span>
                )}
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-message">
                Additional Message (Optional)
              </Label>
              <Textarea
                id="additional-message"
                placeholder="Add a personal message to include with the report..."
                value={emailForm.message}
                onChange={(e) =>
                  handleEmailFormChange("message", e.target.value)
                }
                rows={3}
                disabled={isSendingEmail}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEmailModal(false)}
              disabled={isSendingEmail}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !emailForm.to.trim()}
              className="w-full sm:w-auto"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[95vw] max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Inspection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this inspection? This action
              cannot be undone.
              {inspection.inspectionImageIds &&
                inspection.inspectionImageIds.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="delete-images"
                        checked={deleteImages}
                        onCheckedChange={(checked) =>
                          setDeleteImages(checked as boolean)
                        }
                        className="mt-0.5"
                      />
                      <label
                        htmlFor="delete-images"
                        className="text-sm font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Also delete {inspection.inspectionImageIds.length}{" "}
                        associated image(s) from Cloudflare storage
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      This will permanently remove the images from storage and
                      free up space.
                    </p>
                  </div>
                )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </div>
              ) : (
                "Delete Inspection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
