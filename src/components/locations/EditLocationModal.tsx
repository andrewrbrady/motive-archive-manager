"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LocationResponse, LocationType } from "@/models/location";
import { Checkbox } from "@/components/ui/checkbox";

interface EditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (location: LocationResponse) => void;
  location: LocationResponse;
}

export default function EditLocationModal({
  isOpen,
  onClose,
  onUpdate,
  location,
}: EditLocationModalProps) {
  const [name, setName] = useState(location.name);
  const [address, setAddress] = useState(location.address || "");
  const [city, setCity] = useState(location.city || "");
  const [state, setState] = useState(location.state || "");
  const [country, setCountry] = useState(location.country || "USA");
  const [postalCode, setPostalCode] = useState(location.postalCode || "");
  const [description, setDescription] = useState(location.description || "");
  const [type, setType] = useState<LocationType>(location.type);
  const [isActive, setIsActive] = useState(location.isActive);

  // Update form when location changes
  useEffect(() => {
    setName(location.name);
    setAddress(location.address || "");
    setCity(location.city || "");
    setState(location.state || "");
    setCountry(location.country || "USA");
    setPostalCode(location.postalCode || "");
    setDescription(location.description || "");
    setType(location.type);
    setIsActive(location.isActive);
  }, [location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onUpdate({
      ...location,
      name,
      address,
      city,
      state,
      country,
      postalCode,
      description,
      type,
      isActive,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type *
              </Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as LocationType)}
                required
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Studio">Studio</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Warehouse">Warehouse</SelectItem>
                  <SelectItem value="Storage">Storage</SelectItem>
                  <SelectItem value="Client Site">Client Site</SelectItem>
                  <SelectItem value="Shooting Location">
                    Shooting Location
                  </SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="city" className="text-right">
                City
              </Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="state" className="text-right">
                State
              </Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="country" className="text-right">
                Country
              </Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="postalCode" className="text-right">
                Postal Code
              </Label>
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                Active
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  {isActive ? "Active" : "Inactive"}
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Update Location</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
