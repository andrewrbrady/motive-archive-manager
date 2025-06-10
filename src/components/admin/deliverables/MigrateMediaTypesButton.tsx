"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAPI } from "@/hooks/useAPI";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Database, Loader2 } from "lucide-react";

interface MigrationResult {
  deliverableId: string;
  title: string;
  legacyType?: string;
  newMediaTypeId?: string;
  status: string;
}

interface MigrationResponse {
  message: string;
  totalProcessed: number;
  migrated: number;
  skipped: number;
  results: MigrationResult[];
}

export default function MigrateMediaTypesButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MigrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const api = useAPI();

  const runMigration = async () => {
    if (!api) {
      setError("API not available");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post(
        "/api/deliverables/migrate-media-types",
        {}
      );
      setResult(response as MigrationResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Migration failed");
      console.error("Migration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Migrate Legacy Media Types
        </CardTitle>
        <CardDescription>
          Convert deliverables with legacy type fields to use proper MediaType
          IDs. This will find deliverables that have a 'type' field but no
          'mediaTypeId' and assign the appropriate MediaType ID.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runMigration}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Migration...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Run Migration
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm text-success-foreground">
                {result.message}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {result.totalProcessed}
                </div>
                <div className="text-sm text-blue-600">Total Processed</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {result.migrated}
                </div>
                <div className="text-sm text-green-600">Migrated</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {result.skipped}
                </div>
                <div className="text-sm text-yellow-600">Skipped</div>
              </div>
            </div>

            {result.results.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Migration Details:</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {result.results.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.title || `Deliverable ${item.deliverableId}`}
                        </div>
                        {item.legacyType && (
                          <div className="text-xs text-muted-foreground">
                            Legacy type: {item.legacyType}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={
                          item.status.includes("migrated")
                            ? "default"
                            : "secondary"
                        }
                        className="ml-2"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
