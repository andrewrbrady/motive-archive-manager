import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Camera, Calendar } from "lucide-react";

interface PhotoShootsProps {
  carId: string;
}

export default function PhotoShoots({ carId }: PhotoShootsProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
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
            <CardTitle className="text-sm font-medium">Past Shoots</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-muted-foreground">
              No past shoots found
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
