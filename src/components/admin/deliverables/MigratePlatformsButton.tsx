"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  ArrowRight,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";

interface MigrationResult {
  deliverableId: string;
  title: string;
  source: string;
  newPlatformId?: string;
  status: string;
}

interface MigrationResponse {
  message: string;
  totalProcessed: number;
  migrated: number;
  skipped: number;
  results: MigrationResult[];
}

export default function MigratePlatformsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MigrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const api = useAPI();

  const handleMigration = async () => {
    if (!api) {
      setError("API not available");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log("🔄 Starting platform migration...");

      const response = await api.post("/api/deliverables/migrate-platforms");

      console.log("✅ Platform migration completed:", response);
      setResults(response as MigrationResponse);
    } catch (err) {
      console.error("❌ Platform migration failed:", err);
      setError(err instanceof Error ? err.message : "Migration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "migrated") {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <AlertCircle className="h-4 w-4 text-orange-600" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Migrate Platforms to Single Selection
        </CardTitle>
        <CardDescription>
          Convert deliverables from the old multiple-platform system to the new
          single-platform approach. This will use the first platform from the
          platforms array or the legacy platform field.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!results && (
          <div className="space-y-3">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> This migration will:
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>
                    Convert deliverables to use a single platform_id field
                  </li>
                  <li>Use the first platform from platforms arrays</li>
                  <li>
                    Fall back to the legacy platform field if no platforms array
                    exists
                  </li>
                  <li>Skip deliverables that already have platform_id set</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleMigration}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Migration...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Start Platform Migration
                </>
              )}
            </Button>
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <Alert variant={results.migrated > 0 ? "default" : "destructive"}>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{results.message}</strong>
                <div className="mt-2 space-y-1">
                  <div>📊 Total processed: {results.totalProcessed}</div>
                  <div>✅ Successfully migrated: {results.migrated}</div>
                  <div>⚠️ Skipped: {results.skipped}</div>
                </div>
              </AlertDescription>
            </Alert>

            {results.totalProcessed > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Migration Progress</span>
                  <span>
                    {results.migrated + results.skipped} /{" "}
                    {results.totalProcessed}
                  </span>
                </div>
                <Progress value={100} className="w-full" />
              </div>
            )}

            {results.results && results.results.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Migration Details:</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {results.results.map((result, index) => (
                    <div
                      key={result.deliverableId}
                      className="flex items-start gap-2 p-2 bg-muted rounded-lg text-xs"
                    >
                      {getStatusIcon(result.status)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {result.title}
                        </div>
                        <div className="text-muted-foreground">
                          Source: {result.source}
                        </div>
                        {result.newPlatformId && (
                          <div className="text-muted-foreground">
                            Platform ID: {result.newPlatformId}
                          </div>
                        )}
                        <div className="capitalize">{result.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                setResults(null);
                setError(null);
              }}
              variant="outline"
              className="w-full"
            >
              Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
