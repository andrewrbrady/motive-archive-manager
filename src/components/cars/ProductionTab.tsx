import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Camera, FileText, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ShotList from "./ShotList";

interface ProductionTabProps {
  carId: string;
}

export default function ProductionTab({ carId }: ProductionTabProps) {
  const [activeSection, setActiveSection] = useState("shoots");

  return (
    <div className="space-y-6">
      <Tabs
        value={activeSection}
        onValueChange={setActiveSection}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="shoots">Photo Shoots</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

              {/* Shot List Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Shot List
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ShotList carId={carId} />
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
      </Tabs>
    </div>
  );
}
