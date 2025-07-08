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
import {
  Plus,
  Edit,
  Trash2,
  Camera,
  FileText,
  List,
  Check,
  X,
  ChevronLeft,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ShotListTemplates, { ShotTemplate } from "./ShotListTemplates";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAPI } from "@/hooks/useAPI";
import { toast as hotToast } from "react-hot-toast";

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
  const api = useAPI();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [shotLists, setShotLists] = useState<ShotList[]>([]);
  const [selectedList, setSelectedList] = useState<ShotList | null>(null);
  const [isAddingShot, setIsAddingShot] = useState(false);
  const [isAddingList, setIsAddingList] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  const showDetails = searchParams?.get("list") !== null;

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
    const listId = searchParams?.get("list");
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
    const params = new URLSearchParams(searchParams?.toString() || "");
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
    if (!api) return;

    try {
      setIsLoading(true);
      const data = await api.get<ShotList[]>(`cars/${carId}/shot-lists`);
      setShotLists(data);
      if (data.length > 0 && !selectedList) {
        setSelectedList(data[0]);
      }
    } catch (error: any) {
      console.error("Error fetching shot lists:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch shot lists";
      hotToast.error(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async (data: {
    name: string;
    description: string;
    shots?: ShotTemplate[];
  }) => {
    if (!api) return;

    try {
      const requestData = {
        name: data.name,
        description: data.description,
        shots: data.shots || [],
      };

      const newList = await api.post<ShotList>(
        `cars/${carId}/shot-lists`,
        requestData
      );

      await fetchShotLists();
      updateUrlParams(newList.id);
      hotToast.success("Shot list created successfully");
      toast.success("Shot list created successfully");
      setIsAddingList(false);
      listForm.reset();
    } catch (error: any) {
      console.error("Error creating shot list:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create shot list";
      hotToast.error(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!api) return;
    if (!confirm("Are you sure you want to delete this shot list?")) return;

    try {
      await api.delete(`cars/${carId}/shot-lists/${listId}`);

      await fetchShotLists();
      if (selectedList?.id === listId) {
        updateUrlParams(null);
      }
      hotToast.success("Shot list deleted successfully");
      toast.success("Shot list deleted successfully");
    } catch (error: any) {
      console.error("Error deleting shot list:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete shot list";
      hotToast.error(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleSubmitShot = async (data: Shot) => {
    if (!api) return;
    if (!selectedList) return;

    try {
      const updatedShots = editingShot
        ? selectedList.shots.map((shot) =>
            shot.id === editingShot.id ? { ...data, id: shot.id } : shot
          )
        : [...selectedList.shots, { ...data, id: crypto.randomUUID() }];

      const requestData = {
        ...selectedList,
        shots: updatedShots,
      };

      const updatedList = await api.put<ShotList>(
        `cars/${carId}/shot-lists/${selectedList.id}`,
        requestData
      );

      setShotLists((lists) =>
        lists.map((list) => (list.id === selectedList.id ? updatedList : list))
      );
      setSelectedList(updatedList);

      const successMessage = editingShot
        ? "Shot updated successfully"
        : "Shot added successfully";
      hotToast.success(successMessage);
      toast.success(successMessage);
      setEditingShot(null);
      shotForm.reset();
    } catch (error: any) {
      console.error("Error saving shot:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save shot";
      hotToast.error(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDeleteShot = async (shotId: string) => {
    if (!api) return;
    if (!selectedList || !confirm("Are you sure you want to delete this shot?"))
      return;

    try {
      const updatedShots = selectedList.shots.filter(
        (shot) => shot.id !== shotId
      );

      const requestData = {
        ...selectedList,
        shots: updatedShots,
      };

      const updatedList = await api.put<ShotList>(
        `cars/${carId}/shot-lists/${selectedList.id}`,
        requestData
      );

      setShotLists((lists) =>
        lists.map((list) => (list.id === selectedList.id ? updatedList : list))
      );
      setSelectedList(updatedList);

      hotToast.success("Shot deleted successfully");
      toast.success("Shot deleted successfully");
    } catch (error: any) {
      console.error("Error deleting shot:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete shot";
      hotToast.error(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleEditShot = (shot: Shot) => {
    setEditingShot(shot);
    shotForm.reset(shot);
  };

  const handleCancelEdit = () => {
    setEditingShot(null);
    shotForm.reset();
  };

  const handleAddNewShot = () => {
    const newShot: Shot = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      angle: "",
      lighting: "",
      notes: "",
      completed: false,
    };
    setEditingShot(newShot);
    shotForm.reset(newShot);
  };

  const handleToggleComplete = async (shot: Shot) => {
    if (!api) return;
    if (!selectedList) return;

    try {
      const updatedShots = selectedList.shots.map((s) =>
        s.id === shot.id ? { ...s, completed: !s.completed } : s
      );

      const requestData = {
        ...selectedList,
        shots: updatedShots,
      };

      await api.put<ShotList>(
        `cars/${carId}/shot-lists/${selectedList.id}`,
        requestData
      );

      await fetchShotLists();
    } catch (error: any) {
      console.error("Error updating shot status:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update shot status";
      hotToast.error(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleApplyTemplate = async (templateShots: ShotTemplate[]) => {
    if (!api) {
      toast.error("Please select or create a shot list first");
      return;
    }
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

      const requestData = {
        ...selectedList,
        shots: updatedShots,
      };

      await api.put<ShotList>(
        `cars/${carId}/shot-lists/${selectedList.id}`,
        requestData
      );

      setSelectedList((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          shots: updatedShots,
        };
      });

      setShowTemplates(false);
      await fetchShotLists();
      hotToast.success("Template applied successfully");
      toast.success("Template applied successfully");
    } catch (error: any) {
      console.error("Error applying template:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to apply template";
      hotToast.error(errorMessage);
      toast.error(errorMessage);
    }
  };

  if (!api) {
    return <LoadingSpinner />;
  }

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
        <div className="text-center py-4">
          <LoadingSpinner size="md" />
        </div>
      ) : shotLists.length === 0 ? (
        <div className="text-center py-4 text-[hsl(var(--foreground-muted))]">
          No shot lists yet. Create a new list or use a template to get started.
        </div>
      ) : (
        <div className="space-y-6">
          {!showDetails ? (
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
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseDetails}
                    className="hover:bg-[hsl(var(--background))]"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Lists
                  </Button>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedList?.name}
                    </h2>
                    <p className="text-sm text-[hsl(var(--foreground-muted))]">
                      {selectedList?.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Shots</h4>
                  <Button onClick={handleAddNewShot}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Shot
                  </Button>
                </div>

                <div className="grid gap-4">
                  {selectedList?.shots.map((shot) => (
                    <div
                      key={shot.id}
                      className={`bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-4 ${
                        shot.completed ? "opacity-75" : ""
                      } ${
                        editingShot?.id === shot.id
                          ? "ring-2 ring-[hsl(var(--border))]"
                          : ""
                      }`}
                    >
                      {editingShot?.id === shot.id ? (
                        <Form {...shotForm}>
                          <form
                            onSubmit={shotForm.handleSubmit(handleSubmitShot)}
                            className="space-y-4"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <FormField
                                control={shotForm.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem className="flex-1 mr-4">
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
                              <div className="flex gap-2">
                                <Button type="submit" variant="ghost" size="sm">
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <FormField
                              control={shotForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
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

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={shotForm.control}
                                name="angle"
                                render={({ field }) => (
                                  <FormItem>
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
                            </div>

                            <FormField
                              control={shotForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
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
                          </form>
                        </Form>
                      ) : (
                        <>
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
                              {shot.lighting && (
                                <p>Lighting: {shot.lighting}</p>
                              )}
                              {shot.notes && <p>Notes: {shot.notes}</p>}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
