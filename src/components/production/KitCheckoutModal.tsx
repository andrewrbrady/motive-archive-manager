import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kit } from "@/types/inventory";
import { UrlModal } from "@/components/ui/url-modal";

interface User {
  _id: string;
  name: string;
  email: string;
  status?: string;
  active?: boolean;
}

interface KitCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit: Kit;
  mode: "checkout" | "checkin";
  onCheckout: (userId: string, returnDate: Date) => void;
  onCheckin: () => void;
}

export default function KitCheckoutModal({
  isOpen,
  onClose,
  kit,
  mode,
  onCheckout,
  onCheckin,
}: KitCheckoutModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [expectedReturnDate, setExpectedReturnDate] = useState<
    Date | undefined
  >(new Date(new Date().setDate(new Date().getDate() + 7)));
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Fetch users when modal opens in checkout mode
  useEffect(() => {
    if (isOpen && mode === "checkout") {
      fetchUsers();
    }
  }, [isOpen, mode]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
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

  const handleCheckout = () => {
    if (!selectedUserId || !expectedReturnDate) return;

    // Set time to noon to avoid timezone issues
    const returnDate = new Date(expectedReturnDate);
    returnDate.setHours(12, 0, 0, 0);

    onCheckout(selectedUserId, returnDate);
  };

  const handleCheckin = () => {
    onCheckin();
  };

  return (
    <UrlModal
      paramName="kit"
      paramValue={kit.id}
      onClose={onClose}
      title={mode === "checkout" ? "Check Out Kit" : "Check In Kit"}
      preserveParams={["tab", "page", "limit", "search", "status", "mode"]}
      className="sm:max-w-[425px]"
    >
      <div className="py-4">
        <div className="mb-4">
          <h3 className="font-medium">{kit.name}</h3>
          <p className="text-sm text-muted-foreground">{kit.description}</p>
        </div>

        {mode === "checkout" ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Check Out To</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  disabled={isLoadingUsers}
                >
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingUsers ? (
                      <SelectItem value="loading" disabled>
                        Loading users...
                      </SelectItem>
                    ) : users.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No active users found
                      </SelectItem>
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="return-date">Expected Return Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="return-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expectedReturnDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expectedReturnDate ? (
                        format(expectedReturnDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expectedReturnDate}
                      onSelect={setExpectedReturnDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p>
              You are about to check in the kit{" "}
              <span className="font-medium">{kit.name}</span>.
            </p>
            <p>
              This will mark all items in the kit as available and update the
              checkout history.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={mode === "checkout" ? handleCheckout : handleCheckin}
          disabled={
            isLoading ||
            (mode === "checkout" && (!selectedUserId || !expectedReturnDate))
          }
        >
          {isLoading
            ? "Processing..."
            : mode === "checkout"
            ? "Check Out"
            : "Check In"}
        </Button>
      </div>
    </UrlModal>
  );
}
