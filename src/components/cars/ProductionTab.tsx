import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Camera, FileText, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";
import ShotList from "./ShotList";
import Scripts from "./Scripts";

interface ProductionTabProps {
  carId: string;
}

export default function ProductionTab({ carId }: ProductionTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState(
    searchParams?.get("section") || "shoots"
  );

  const updateUrlParams = (section: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("section", section);
    router.replace(`?${params.toString()}`);
  };

  useEffect(() => {
    const section = searchParams?.get("section");
    if (section) {
      setActiveSection(section);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <CustomTabs
        items={[
          {
            value: "shoots",
            label: "Photo Shoots",
            content: (
              <TabsContent value="shoots" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Upcoming Shoots
                      </CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-6 text-muted-foreground">
                        No upcoming shoots scheduled
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => router.push(`/schedule?carId=${carId}`)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Schedule Shoot
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Past Shoots
                      </CardTitle>
                      <Camera className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-6 text-muted-foreground">
                        No past shoots found
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            ),
          },
          {
            value: "documentation",
            label: "Documentation",
            content: (
              <TabsContent value="documentation" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Production Documents
                    </CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6 text-muted-foreground">
                      No documents found
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => router.push(`/documents?carId=${carId}`)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Document
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            ),
          },
          {
            value: "shot-lists",
            label: "Shot Lists",
            content: <ShotList carId={carId} />,
          },
          {
            value: "scripts",
            label: "Scripts",
            content: <Scripts carId={carId} />,
          },
        ]}
        defaultValue={activeSection}
        basePath={`/cars/${carId}`}
        paramName="section"
        className="w-full"
      />
    </div>
  );
}
