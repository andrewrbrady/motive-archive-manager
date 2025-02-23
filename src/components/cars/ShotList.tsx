import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Camera, FileText, List } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ShotListTemplates, { ShotTemplate } from "./ShotListTemplates";

interface Shot extends ShotTemplate {
  id: string;
  completed?: boolean;
}

interface ShotList {
  id: string;
  name: string;
  description: string;
  shots: Shot[];
  createdAt: string;
  updatedAt: string;
}

interface ShotListProps {
  carId: string;
}

export default function ShotList({ carId }: ShotListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [shotLists, setShotLists] = useState<ShotList[]>([]);
  const [selectedList, setSelectedList] = useState<ShotList | null>(null);
  const [isAddingShot, setIsAddingShot] = useState(false);
  const [isAddingList, setIsAddingList] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  const showDetails = searchParams.get("list") !== null;

  const shotForm = useForm<Shot>({
    defaultValues: {
      title: "",
      description: "",
      angle: "",
      lighting: "",
      notes: "",
      completed: false,
    },
  });

  const listForm = useForm<{
    name: string;
    description: string;
    shots?: ShotTemplate[];
  }>({
    defaultValues: {
      name: "",
      description: "",
      shots: [],
    },
  });

  useEffect(() => {
    fetchShotLists();
  }, [carId]);

  useEffect(() => {
    const listId = searchParams.get("list");
    if (listId && shotLists.length > 0) {
      const list = shotLists.find((l) => l.id === listId);
      if (list) {
        setSelectedList(list);
      }
    } else if (!listId) {
      setSelectedList(null);
    }
  }, [searchParams, shotLists]);

  const updateUrlParams = (listId: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (listId) {
      params.set("list", listId);
    } else {
      params.delete("list");
    }
    router.replace(`?${params.toString()}`);
  };

  const handleViewDetails = (list: ShotList) => {
    setSelectedList(list);
    updateUrlParams(list.id);
  };

  const handleCloseDetails = () => {
    updateUrlParams(null);
  };

  const fetchShotLists = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/cars/${carId}/shot-lists`);
      if (!response.ok) throw new Error("Failed to fetch shot lists");
      const data = await response.json();
      setShotLists(data);
      if (data.length > 0 && !selectedList) {
        setSelectedList(data[0]);
      }
    } catch (error) {
      console.error("Error fetching shot lists:", error);
      toast.error("Failed to fetch shot lists");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async (data: {
    name: string;
    description: string;
    shots?: ShotTemplate[];
  }) => {
    try {
      const response = await fetch(`/api/cars/${carId}/shot-lists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          shots: data.shots || [],
        }),
      });

      if (!response.ok) throw new Error("Failed to create shot list");

      const newList = await response.json();
      await fetchShotLists();
      updateUrlParams(newList.id);
      toast.success("Shot list created successfully");
      setIsAddingList(false);
      listForm.reset();
    } catch (error) {
      console.error("Error creating shot list:", error);
      toast.error("Failed to create shot list");
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this shot list?")) return;

    try {
      const response = await fetch(`/api/cars/${carId}/shot-lists/${listId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete shot list");

      await fetchShotLists();
      if (selectedList?.id === listId) {
        updateUrlParams(null);
      }
      toast.success("Shot list deleted successfully");
    } catch (error) {
      console.error("Error deleting shot list:", error);
      toast.error("Failed to delete shot list");
    }
  };

  const handleSubmitShot = async (data: Shot) => {
    if (!selectedList) return;

    try {
      const updatedShots = editingShot
        ? selectedList.shots.map((shot) =>
            shot.id === editingShot.id ? { ...data, id: shot.id } : shot
          )
        : [...selectedList.shots, { ...data, id: crypto.randomUUID() }];

      const response = await fetch(
        `/api/cars/${carId}/shot-lists/${selectedList.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...selectedList,
            shots: updatedShots,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save shot");

      const updatedList = await response.json();

      // Update both the lists array and the selected list
      setShotLists((lists) =>
        lists.map((list) => (list.id === selectedList.id ? updatedList : list))
      );
      setSelectedList(updatedList);

      toast.success(
        editingShot ? "Shot updated successfully" : "Shot added successfully"
      );
      setIsAddingShot(false);
      setEditingShot(null);
      shotForm.reset();
    } catch (error) {
      console.error("Error saving shot:", error);
      toast.error("Failed to save shot");
    }
  };

  const handleDeleteShot = async (shotId: string) => {
    if (!selectedList || !confirm("Are you sure you want to delete this shot?"))
      return;

    try {
      const updatedShots = selectedList.shots.filter(
        (shot) => shot.id !== shotId
      );

      const response = await fetch(
        `/api/cars/${carId}/shot-lists/${selectedList.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...selectedList,
            shots: updatedShots,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to delete shot");

      const updatedList = await response.json();

      // Update both the lists array and the selected list
      setShotLists((lists) =>
        lists.map((list) => (list.id === selectedList.id ? updatedList : list))
      );
      setSelectedList(updatedList);

      toast.success("Shot deleted successfully");
    } catch (error) {
      console.error("Error deleting shot:", error);
      toast.error("Failed to delete shot");
    }
  };

  const handleEditShot = (shot: Shot) => {
    setEditingShot(shot);
    shotForm.reset(shot);
    setIsAddingShot(true);
  };

  const handleToggleComplete = async (shot: Shot) => {
    if (!selectedList) return;

    try {
      const updatedShots = selectedList.shots.map((s) =>
        s.id === shot.id ? { ...s, completed: !s.completed } : s
      );

      const response = await fetch(
        `/api/cars/${carId}/shot-lists/${selectedList.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...selectedList,
            shots: updatedShots,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update shot status");

      await fetchShotLists();
    } catch (error) {
      console.error("Error updating shot status:", error);
      toast.error("Failed to update shot status");
    }
  };

  const handleApplyTemplate = async (templateShots: ShotTemplate[]) => {
    if (!selectedList) {
      toast.error("Please select or create a shot list first");
      return;
    }

    try {
      const shotsWithIds = templateShots.map((shot) => ({
        ...shot,
        id: crypto.randomUUID(),
        completed: false,
      }));

      const updatedShots = [...selectedList.shots, ...shotsWithIds];

      const response = await fetch(
        `/api/cars/${carId}/shot-lists/${selectedList.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...selectedList,
            shots: updatedShots,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update shot list");
      }

      setSelectedList((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          shots: updatedShots,
        };
      });

      setShowTemplates(false);
      await fetchShotLists();
      toast.success("Template applied successfully");
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error("Failed to apply template");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-[hsl(var(--border))] hover:bg-[hsl(var(--background))]"
            >
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[hsl(var(--background))]">
            <DialogHeader>
              <DialogTitle>Shot List Templates</DialogTitle>
            </DialogHeader>
            <ShotListTemplates onApplyTemplate={handleApplyTemplate} />
          </DialogContent>
        </Dialog>

        <Dialog open={isAddingList} onOpenChange={setIsAddingList}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-[hsl(var(--border))] hover:bg-[hsl(var(--background))]"
            >
              <Plus className="w-4 h-4 mr-2" />
              New List
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(var(--background))]">
            <DialogHeader>
              <DialogTitle>Create New Shot List</DialogTitle>
            </DialogHeader>
            <Form {...listForm}>
              <form
                onSubmit={listForm.handleSubmit(handleCreateList)}
                className="space-y-4"
              >
                <FormField
                  control={listForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Studio Shoot" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={listForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose of this shot list..."
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Template (Optional)</h4>
                  <ShotListTemplates
                    onApplyTemplate={(shots) => {
                      handleCreateList({
                        name: listForm.getValues("name"),
                        description: listForm.getValues("description"),
                        shots,
                      });
                    }}
                    isEmbedded={true}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Create Empty List</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading shot lists...</div>
      ) : shotLists.length === 0 ? (
        <div className="text-center py-4 text-[hsl(var(--foreground-muted))]">
          No shot lists yet. Create a new list or use a template to get started.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shotLists.map((list) => (
              <div
                key={list.id}
                className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{list.name}</h4>
                    <p className="text-sm text-[hsl(var(--foreground-muted))]">
                      {list.description}
                    </p>
                    <p className="text-sm text-[hsl(var(--foreground-muted))] mt-1">
                      {list.shots.length} shots
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-[hsl(var(--background))]"
                      onClick={() => handleDeleteList(list.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full border-[hsl(var(--border))] hover:bg-[hsl(var(--background))]"
                    onClick={() => handleViewDetails(list)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Dialog open={showDetails} onOpenChange={handleCloseDetails}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[hsl(var(--background))]">
              <DialogHeader>
                <DialogTitle>{selectedList?.name}</DialogTitle>
                <p className="text-sm text-[hsl(var(--foreground-muted))]">
                  {selectedList?.description}
                </p>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Shots</h4>
                  <Dialog open={isAddingShot} onOpenChange={setIsAddingShot}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Shot
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[hsl(var(--background))]">
                      <DialogHeader>
                        <DialogTitle>
                          {editingShot ? "Edit Shot" : "Add New Shot"}
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...shotForm}>
                        <form
                          onSubmit={shotForm.handleSubmit(handleSubmitShot)}
                          className="space-y-4"
                        >
                          <FormField
                            control={shotForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                  <Input
                                    className="bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] focus:border-[hsl(var(--border-subtle))] focus-visible:ring-zinc-600 focus-visible:ring-1"
                                    placeholder="e.g., Front 3/4 View"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={shotForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    className="bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] focus:border-[hsl(var(--border-subtle))] focus-visible:ring-zinc-600 focus-visible:ring-1"
                                    placeholder="Describe the shot composition..."
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={shotForm.control}
                            name="angle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Angle</FormLabel>
                                <FormControl>
                                  <Input
                                    className="bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] focus:border-[hsl(var(--border-subtle))] focus-visible:ring-zinc-600 focus-visible:ring-1"
                                    placeholder="e.g., Low angle, eye level"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={shotForm.control}
                            name="lighting"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Lighting</FormLabel>
                                <FormControl>
                                  <Input
                                    className="bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] focus:border-[hsl(var(--border-subtle))] focus-visible:ring-zinc-600 focus-visible:ring-1"
                                    placeholder="e.g., Natural, Studio"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={shotForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Additional Notes</FormLabel>
                                <FormControl>
                                  <Textarea
                                    className="bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] focus:border-[hsl(var(--border-subtle))] focus-visible:ring-zinc-600 focus-visible:ring-1"
                                    placeholder="Any additional notes or requirements..."
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end">
                            <Button type="submit">
                              {editingShot ? "Update Shot" : "Add Shot"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4">
                  {selectedList?.shots.map((shot) => (
                    <div
                      key={shot.id}
                      className={`bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-4 ${
                        shot.completed ? "opacity-75" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleComplete(shot)}
                            className={`w-5 h-5 rounded border ${
                              shot.completed
                                ? "bg-[hsl(var(--background))] border-zinc-600"
                                : "border-[hsl(var(--border-subtle))]"
                            }`}
                          >
                            {shot.completed && (
                              <span className="text-zinc-200 flex items-center justify-center">
                                ✓
                              </span>
                            )}
                          </button>
                          <div>
                            <h4 className="font-medium">{shot.title}</h4>
                            <p className="text-sm text-[hsl(var(--foreground-muted))]">
                              {shot.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditShot(shot)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteShot(shot.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {(shot.angle || shot.lighting || shot.notes) && (
                        <div className="mt-3 text-sm text-[hsl(var(--foreground-muted))] space-y-1">
                          {shot.angle && <p>Angle: {shot.angle}</p>}
                          {shot.lighting && <p>Lighting: {shot.lighting}</p>}
                          {shot.notes && <p>Notes: {shot.notes}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
