import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Camera, FileText, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ShotList from "./ShotList";
import Scripts from "./Scripts";

interface ProductionTabProps {
  carId: string;
}

export default function ProductionTab({ carId }: ProductionTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState(
    searchParams.get("section") || "shoots"
  );

  const updateUrlParams = (section: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("section", section);
    router.replace(`?${params.toString()}`);
  };

  useEffect(() => {
    const section = searchParams.get("section");
    if (section) {
      setActiveSection(section);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <Tabs
        value={activeSection}
        onValueChange={(value) => {
          setActiveSection(value);
          updateUrlParams(value);
        }}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="shoots">Photo Shoots</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
          <TabsTrigger value="shot-lists">Shot Lists</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
        </TabsList>

        <TabsContent value="shoots" className="mt-6">
          <div className="grid gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Photo Shoots</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Shoot
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upcoming Shoots Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Upcoming Shoots
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    No upcoming shoots scheduled
                  </p>
                </CardContent>
              </Card>

              {/* Recent Shoots Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Recent Shoots
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    No recent shoots found
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documentation" className="mt-6">
          <div className="grid gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Documentation</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Vehicle Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Basic vehicle information and specifications
                  </p>
                </CardContent>
              </Card>

              {/* Condition Report Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Condition Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Detailed condition assessment and documentation
                  </p>
                </CardContent>
              </Card>

              {/* Maintenance Records Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Service history and maintenance documentation
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="shot-lists" className="mt-6">
          <ShotList carId={carId} />
        </TabsContent>

        <TabsContent value="scripts" className="mt-6">
          <Scripts carId={carId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
