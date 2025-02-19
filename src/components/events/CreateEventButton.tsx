import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import EventForm from "./EventForm";

interface CreateEventButtonProps {
  carId: string;
  onEventCreated: () => void;
}

export default function CreateEventButton({
  carId,
  onEventCreated,
}: CreateEventButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Create Event</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <EventForm
          carId={carId}
          onSuccess={() => {
            onEventCreated();
            setIsOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
