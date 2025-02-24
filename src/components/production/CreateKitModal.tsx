"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { Kit, KitCategory, StudioInventoryItem } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (kit: Omit<Kit, "id">) => void;
  availableItems: StudioInventoryItem[];
}

export default function CreateKitModal({
  isOpen,
  onClose,
  onCreate,
  availableItems,
}: CreateKitModalProps) {
  const [formData, setFormData] = useState<Omit<Kit, "id">>({
    name: "",
    description: "",
    category: "Camera Package",
    items: [],
    isAvailable: true,
    notes: "",
    location: "",
  });

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      ...formData,
      items: selectedItems,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-xl w-full bg-background border border-border rounded-lg p-6 shadow-lg">
          <Dialog.Title className="text-xl font-semibold mb-4 text-foreground">
            Create New Kit
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Kit Name
              </label>
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Category
              </label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as KitCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Camera Package">Camera Package</SelectItem>
                  <SelectItem value="Lighting Package">
                    Lighting Package
                  </SelectItem>
                  <SelectItem value="Audio Package">Audio Package</SelectItem>
                  <SelectItem value="Production Package">
                    Production Package
                  </SelectItem>
                  <SelectItem value="Custom Package">Custom Package</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <Textarea
                rows={2}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Select Items
              </label>
              <div className="max-h-48 overflow-y-auto border border-border rounded-md p-2 space-y-2">
                {availableItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={item.id}
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(
                            selectedItems.filter((id) => id !== item.id)
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={item.id}
                      className="text-sm text-foreground"
                    >
                      {item.name} - {item.manufacturer} {item.model}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Location
              </label>
              <Input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Notes
              </label>
              <Textarea
                rows={2}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button type="submit" variant="default">
                Create Kit
              </Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
