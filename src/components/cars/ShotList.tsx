import { useState, useEffect } from "react";
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
import ShotListTemplates from "./ShotListTemplates";

interface Shot {
  id: string;
  title: string;
  description: string;
  angle?: string;
  lighting?: string;
  notes?: string;
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
  const [shotLists, setShotLists] = useState<ShotList[]>([]);
  const [selectedList, setSelectedList] = useState<ShotList | null>(null);
  const [isAddingShot, setIsAddingShot] = useState(false);
  const [isAddingList, setIsAddingList] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

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

  const listForm = useForm<{ name: string; description: string }>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    fetchShotLists();
  }, [carId]);

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
          shots: [],
        }),
      });

      if (!response.ok) throw new Error("Failed to create shot list");

      await fetchShotLists();
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
        setSelectedList(null);
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

      await fetchShotLists();
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

      await fetchShotLists();
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

  const handleApplyTemplate = async (templateShots: Shot[]) => {
    try {
      const response = await fetch(`/api/cars/${carId}/shot-lists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "New Shot List from Template",
          description: "Created from template",
          shots: templateShots.map((shot) => ({
            ...shot,
            id: crypto.randomUUID(),
            completed: false,
          })),
        }),
      });

      if (!response.ok)
        throw new Error("Failed to create shot list from template");

      await fetchShotLists();
      setShowTemplates(false);
      toast.success("Template applied successfully");
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error("Failed to apply template");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Shot Lists</h3>
        <div className="flex gap-2">
          <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Shot List Templates</DialogTitle>
              </DialogHeader>
              <ShotListTemplates onApplyTemplate={handleApplyTemplate} />
            </DialogContent>
          </Dialog>

          <Dialog open={isAddingList} onOpenChange={setIsAddingList}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New List
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                  <div className="flex justify-end">
                    <Button type="submit">Create List</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading shot lists...</div>
      ) : shotLists.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          No shot lists yet. Create a new list or use a template to get started.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {shotLists.map((list) => (
              <Button
                key={list.id}
                variant={selectedList?.id === list.id ? "default" : "outline"}
                className="whitespace-nowrap"
                onClick={() => setSelectedList(list)}
              >
                <List className="w-4 h-4 mr-2" />
                {list.name}
              </Button>
            ))}
          </div>

          {selectedList && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{selectedList.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedList.description}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteList(selectedList.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Dialog open={isAddingShot} onOpenChange={setIsAddingShot}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Shot
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
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
              </div>

              <div className="grid gap-4">
                {selectedList.shots.map((shot) => (
                  <div
                    key={shot.id}
                    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${
                      shot.completed ? "opacity-75" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleComplete(shot)}
                          className={`w-5 h-5 rounded border ${
                            shot.completed
                              ? "bg-green-500 border-green-600"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {shot.completed && (
                            <span className="text-white flex items-center justify-center">
                              ✓
                            </span>
                          )}
                        </button>
                        <div>
                          <h4 className="font-medium">{shot.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
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
                      <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {shot.angle && <p>Angle: {shot.angle}</p>}
                        {shot.lighting && <p>Lighting: {shot.lighting}</p>}
                        {shot.notes && <p>Notes: {shot.notes}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
