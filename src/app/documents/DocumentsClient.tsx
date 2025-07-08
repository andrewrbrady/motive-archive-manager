"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";

interface Document {
  _id: string;
  merchant: {
    name: string;
  };
  transaction: {
    date: string;
    total: number;
  };
  item_count: number;
}

interface Props {
  carId: string;
  initialDocuments: Document[];
}

export default function DocumentsClient({ carId, initialDocuments }: Props) {
  const api = useAPI();
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<Document | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (!api) return <div>Loading...</div>;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const newDocument = (await api.post("documents", {
        carId,
        merchant: {
          name: formData.get("merchantName"),
        },
        transaction: {
          date: formData.get("date"),
          total: parseFloat(formData.get("total") as string),
        },
        items: [],
      })) as Document;

      setDocuments([...documents, newDocument]);
      setIsAddModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error creating document:", error);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!documentToEdit) return;

    const formData = new FormData(e.currentTarget);

    try {
      const updatedDocument = (await api.put(
        `documents/${documentToEdit._id}`,
        {
          merchant: {
            name: formData.get("merchantName"),
          },
          transaction: {
            date: formData.get("date"),
            total: parseFloat(formData.get("total") as string),
          },
        }
      )) as Document;

      setDocuments(
        documents.map((doc) =>
          doc._id === updatedDocument._id ? updatedDocument : doc
        )
      );
      setIsEditModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating document:", error);
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      await api.deleteWithBody(`documents/${documentToDelete}`, { carId });

      // Only update UI after successful deletion
      setDocuments((prev) =>
        prev.filter((doc) => doc._id !== documentToDelete)
      );
      setIsDeleteModalOpen(false);
      setDocumentToDelete(null);

      // Move refresh after successful UI update
      router.refresh();
    } catch (error) {
      console.error("Error deleting document:", error);
      // Optionally show error to user (you could add an error state and display it in UI)
      alert("Failed to delete document. Please try again.");
    }
  };

  return (
    <div>
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="w-full text-sm text-left text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
          <thead className="text-xs text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))] uppercase bg-background">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Merchant</th>
              <th className="px-6 py-3">Total</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc._id}
                className="bg-[var(--background-primary)] border-b hover:bg-[hsl(var(--background))]"
              >
                <td className="px-6 py-4">
                  {format(new Date(doc.transaction.date), "MMM d, yyyy")}
                </td>
                <td className="px-6 py-4">{doc.merchant.name}</td>
                <td className="px-6 py-4">
                  ${doc.transaction.total.toFixed(2)}
                </td>
                <td className="px-6 py-4 space-x-2">
                  <button
                    onClick={() => {
                      setDocumentToEdit(doc);
                      setIsEditModalOpen(true);
                    }}
                    className="text-info-600 hover:text-info-900"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDocumentToDelete(doc._id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="text-destructive-600 hover:text-destructive-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--background-primary)] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Document</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                  Merchant Name
                </label>
                <input
                  type="text"
                  name="merchantName"
                  required
                  className="mt-1 block w-full rounded-md border border-[hsl(var(--border-primary))] px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  className="mt-1 block w-full rounded-md border border-[hsl(var(--border-primary))] px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                  Total
                </label>
                <input
                  type="number"
                  name="total"
                  step="0.01"
                  required
                  className="mt-1 block w-full rounded-md border border-[hsl(var(--border-primary))] px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-md hover:bg-[hsl(var(--background))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-info-600 text-white rounded-md hover:bg-info-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && documentToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--background-primary)] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Document</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                  Merchant Name
                </label>
                <input
                  type="text"
                  name="merchantName"
                  defaultValue={documentToEdit.merchant.name}
                  required
                  className="mt-1 block w-full rounded-md border border-[hsl(var(--border-primary))] px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  defaultValue={documentToEdit.transaction.date.split("T")[0]}
                  required
                  className="mt-1 block w-full rounded-md border border-[hsl(var(--border-primary))] px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                  Total
                </label>
                <input
                  type="number"
                  name="total"
                  step="0.01"
                  defaultValue={documentToEdit.transaction.total}
                  required
                  className="mt-1 block w-full rounded-md border border-[hsl(var(--border-primary))] px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border rounded-md hover:bg-[hsl(var(--background))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-info-600 text-white rounded-md hover:bg-info-700"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--background-primary)] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete Document</h3>
            <p className="text-[hsl(var(--foreground-subtle))] mb-4">
              Are you sure you want to delete this document? This action cannot
              be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border rounded-md hover:bg-[hsl(var(--background))]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-destructive-600 text-white rounded-md hover:bg-destructive-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
