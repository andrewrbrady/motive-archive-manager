import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/date-utils";
import { Kit } from "@/types/inventory";
import { Package, Calendar, User, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface KitDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit: Kit;
}

export default function KitDetailsModal({
  isOpen,
  onClose,
  kit,
}: KitDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{kit.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 my-2">
          {kit.status && (
            <Badge
              variant="outline"
              className={
                kit.status.toLowerCase() === "available"
                  ? "bg-green-100 text-green-800"
                  : kit.status.toLowerCase() === "checked-out"
                    ? "bg-orange-100 text-orange-800"
                    : "bg-blue-100 text-blue-800"
              }
            >
              {kit.status}
            </Badge>
          )}
          <Badge variant="outline">{kit.items?.length || 0} items</Badge>
        </div>

        <p className="text-muted-foreground mb-4">{kit.description}</p>

        <ScrollArea className="flex-1 pr-4">
          {kit.checkedOutTo && (
            <div className="bg-muted/30 p-3 rounded-md my-2">
              <h3 className="text-sm font-medium mb-2">Checkout Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Checked Out To:</span>
                  <span>{kit.checkedOutTo}</span>
                </div>
                {kit.checkoutDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Checkout Date:</span>
                    <span>{formatDate(kit.checkoutDate)}</span>
                  </div>
                )}
                {kit.expectedReturnDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Expected Return:</span>
                    <span>{formatDate(kit.expectedReturnDate)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator className="my-2" />

          <div className="flex-1 overflow-hidden">
            <h3 className="text-sm font-medium mb-2">Items in Kit</h3>
            <ScrollArea className="h-[300px] rounded-md border p-2">
              {kit.itemDetails && kit.itemDetails.length > 0 ? (
                <div className="space-y-2">
                  {kit.itemDetails.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 border rounded-md"
                    >
                      {item.primaryImage ? (
                        <div className="h-12 w-12 relative rounded-md overflow-hidden bg-muted">
                          <img
                            src={item.primaryImage}
                            alt={item.name}
                            className="object-cover h-full w-full"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 flex items-center justify-center rounded-md bg-muted">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.category} • {item.manufacturer} {item.model}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          item.isAvailable
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }
                      >
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No items in this kit
                </div>
              )}
            </ScrollArea>
          </div>

          {kit.checkoutHistory && kit.checkoutHistory.length > 0 && (
            <>
              <Separator className="my-2" />
              <div>
                <h3 className="text-sm font-medium mb-2">Checkout History</h3>
                <ScrollArea className="h-[150px] rounded-md border p-2">
                  <div className="space-y-2">
                    {kit.checkoutHistory.map((record, index) => (
                      <div
                        key={index}
                        className="p-2 border rounded-md text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">Checked Out To:</span>
                          <span>{record.checkedOutTo}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">Checkout Date:</span>
                            <span>{formatDate(record.checkedOutDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              Expected Return:
                            </span>
                            <span>{formatDate(record.expectedReturnDate)}</span>
                          </div>
                          {record.actualReturnDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">
                                Actual Return:
                              </span>
                              <span>{formatDate(record.actualReturnDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
