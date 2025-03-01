"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { StudioInventoryItem } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading";

interface User {
  _id: string;
  name: string;
  email: string;
  roles?: string[];
  creativeRoles?: string[];
  status?: string;
  active?: boolean;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: StudioInventoryItem[];
  mode: "checkout" | "checkin";
  onSave: (
    action: "checkout" | "checkin",
    data?: { checkedOutTo: string; expectedReturnDate?: Date }
  ) => Promise<void>;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  selectedItems,
  mode,
  onSave,
}: CheckoutModalProps) {
  const [checkedOutTo, setCheckedOutTo] = useState<string>("");
  const [expectedReturnDate, setExpectedReturnDate] = useState<
    Date | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const response = await fetch("/api/users");
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        // API returns an array of users directly
        setUsers(
          data.filter(
            (user: User) => user.status === "active" || user.active === true
          )
        );
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (isOpen && mode === "checkout") {
      fetchUsers();
    }
  }, [isOpen, mode]);

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      if (mode === "checkout") {
        await onSave("checkout", {
          checkedOutTo,
          expectedReturnDate,
        });
      } else {
        await onSave("checkin");
      }

      onClose();

      // Reset form
      setCheckedOutTo("");
      setExpectedReturnDate(undefined);
    } catch (error) {
      console.error(
        `Error ${mode === "checkout" ? "checking out" : "checking in"} items:`,
        error
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-background border border-border rounded-lg shadow-lg">
          <div className="text-xl font-semibold px-6 py-4 border-b border-border flex items-center justify-between">
            {mode === "checkout" ? "Check Out" : "Check In"} (
            {selectedItems.length} items)
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-6">
            {mode === "checkout" ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="checkedOutTo" className="text-sm font-medium">
                    Checked Out To
                  </Label>
                  <Select value={checkedOutTo} onValueChange={setCheckedOutTo}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingUsers ? (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center">
                            <LoadingSpinner size={14} text="Loading users..." />
                          </div>
                        </SelectItem>
                      ) : users.length > 0 ? (
                        users.map((user) => (
                          <SelectItem key={user._id} value={user.name}>
                            {user.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-users" disabled>
                          No users found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="expectedReturnDate"
                    className="text-sm font-medium"
                  >
                    Expected Return Date
                  </Label>
                  <div className="flex mt-1">
                    <Input
                      id="expectedReturnDate"
                      type="date"
                      value={
                        expectedReturnDate
                          ? format(expectedReturnDate, "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          // Fix timezone issue by parsing the date and setting it to noon
                          // This ensures the date doesn't shift due to timezone conversions
                          const dateParts = e.target.value.split("-");
                          const year = parseInt(dateParts[0], 10);
                          const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
                          const day = parseInt(dateParts[2], 10);

                          // Set to noon to avoid timezone issues
                          const date = new Date(year, month, day, 12, 0, 0);
                          setExpectedReturnDate(date);
                        } else {
                          setExpectedReturnDate(undefined);
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                  {expectedReturnDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Items expected back on {format(expectedReturnDate, "PPP")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-2">
                <p>
                  Are you sure you want to check in {selectedItems.length} item
                  {selectedItems.length !== 1 ? "s" : ""}?
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  This will mark the items as available and clear any checkout
                  information.
                </p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border flex justify-end gap-2 bg-muted/50">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || (mode === "checkout" && !checkedOutTo)}
            >
              {isLoading
                ? `${mode === "checkout" ? "Checking Out" : "Checking In"}...`
                : mode === "checkout"
                ? "Check Out"
                : "Check In"}
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
