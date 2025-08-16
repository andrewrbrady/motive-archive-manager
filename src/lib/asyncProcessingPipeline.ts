/**
 * Async Processing Pipeline - Phase 2 Implementation
 *
 * Separates upload from analysis for maximum performance.
 * Uploads happen immediately, analysis happens in background.
 */

interface UploadJob {
  id: string;
  file: File;
  metadata: any;
  context: string;
  priority: "high" | "normal" | "low";
}

interface AnalysisJob {
  id: string;
  imageId: string;
  imageUrl: string;
  context: string;
  priority: "high" | "normal" | "low";
  retryCount: number;
}

class AsyncProcessingPipeline {
  private uploadQueue: UploadJob[] = [];
  private analysisQueue: AnalysisJob[] = [];
  private isProcessingUploads = false;
  private isProcessingAnalysis = false;

  private readonly MAX_UPLOAD_CONCURRENCY = 20;
  private readonly MAX_ANALYSIS_CONCURRENCY = 16;

  /**
   * Phase 1: Fast Upload Processing
   * Uploads files to Cloudflare in parallel, stores in DB immediately
   */
  async processUploads(
    jobs: UploadJob[]
  ): Promise<{ success: any[]; failed: any[] }> {
    const results: { success: any[]; failed: any[] } = {
      success: [],
      failed: [],
    };

    // Process uploads with high concurrency
    const uploadPromises = jobs.map(async (job) => {
      try {
        // 1. Upload to Cloudflare (fastest part)
        const cloudflareResult = await this.uploadToCloudflare(job.file);

        // 2. Store in database immediately
        const imageDoc = await this.storeImageDocument(
          cloudflareResult,
          job.metadata
        );

        // 3. Queue for analysis (non-blocking)
        if (job.context === "car") {
          this.queueAnalysis({
            id: `analysis-${job.id}`,
            imageId: imageDoc._id,
            imageUrl: cloudflareResult.url,
            context: job.context,
            priority: "high",
            retryCount: 0,
          });
        }

        results.success.push({
          jobId: job.id,
          imageId: imageDoc._id,
          url: cloudflareResult.url,
          uploadTime: Date.now(),
        });
      } catch (error) {
        results.failed.push({
          jobId: job.id,
          error: error instanceof Error ? error.message : "Unknown error",
          file: job.file.name,
        });
      }
    });

    // Execute all uploads in parallel
    await Promise.allSettled(uploadPromises);

    return results;
  }

  /**
   * Phase 2: Background Analysis Processing
   * Analyzes images with OpenAI in background without blocking uploads
   */
  async processAnalysisQueue(): Promise<void> {
    if (this.isProcessingAnalysis || this.analysisQueue.length === 0) {
      return;
    }

    this.isProcessingAnalysis = true;

    try {
      // Sort by priority and process in batches
      const sortedJobs = this.analysisQueue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Process analysis with controlled concurrency
      const batches = this.createBatches(
        sortedJobs,
        this.MAX_ANALYSIS_CONCURRENCY
      );

      for (const batch of batches) {
        const analysisPromises = batch.map((job) =>
          this.processAnalysisJob(job)
        );
        await Promise.allSettled(analysisPromises);
      }

      // Clear completed jobs
      this.analysisQueue = [];
    } finally {
      this.isProcessingAnalysis = false;
    }
  }

  private async processAnalysisJob(job: AnalysisJob): Promise<void> {
    try {
      // Call OpenAI analysis
      const analysisResult = await this.analyzeWithOpenAI(
        job.imageUrl,
        job.context
      );

      // Update database with analysis results
      await this.updateImageAnalysis(job.imageId, analysisResult);

      console.log(`✅ Analysis completed for image ${job.imageId}`);
    } catch (error) {
      console.error(`❌ Analysis failed for image ${job.imageId}:`, error);

      // Retry logic
      if (job.retryCount < 3) {
        this.queueAnalysis({
          ...job,
          retryCount: job.retryCount + 1,
          priority: "low", // Lower priority for retries
        });
      }
    }
  }

  private queueAnalysis(job: AnalysisJob): void {
    this.analysisQueue.push(job);

    // Start processing if not already running
    if (!this.isProcessingAnalysis) {
      // Process asynchronously without awaiting
      this.processAnalysisQueue().catch(console.error);
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async uploadToCloudflare(file: File): Promise<any> {
    // Implementation would call actual Cloudflare API
    // This is a placeholder for the existing upload logic
    throw new Error(
      "Implementation needed - integrate with existing Cloudflare upload"
    );
  }

  private async storeImageDocument(
    cloudflareResult: any,
    metadata: any
  ): Promise<any> {
    // Implementation would store in MongoDB
    // This is a placeholder for the existing database logic
    throw new Error(
      "Implementation needed - integrate with existing database storage"
    );
  }

  private async analyzeWithOpenAI(
    imageUrl: string,
    context: string
  ): Promise<any> {
    // Implementation would call OpenAI API
    // This is a placeholder for the existing analysis logic
    throw new Error(
      "Implementation needed - integrate with existing OpenAI analysis"
    );
  }

  private async updateImageAnalysis(
    imageId: string,
    analysisResult: any
  ): Promise<void> {
    // Implementation would update MongoDB document
    // This is a placeholder for the existing update logic
    throw new Error(
      "Implementation needed - integrate with existing database update"
    );
  }
}

// Export singleton instance
export const asyncPipeline = new AsyncProcessingPipeline();

/**
 * High-level API for processing uploads with async analysis
 */
export async function processUploadsAsync(
  files: File[],
  metadata: any,
  context: string = "general"
): Promise<{ uploadResults: any[]; analysisQueued: number }> {
  // Convert files to upload jobs
  const uploadJobs: UploadJob[] = files.map((file, index) => ({
    id: `upload-${Date.now()}-${index}`,
    file,
    metadata,
    context,
    priority: context === "car" ? "high" : "normal",
  }));

  // Process uploads immediately
  const uploadResults = await asyncPipeline.processUploads(uploadJobs);

  // Analysis is queued automatically and runs in background
  const analysisQueued = uploadResults.success.filter(
    (r) => context === "car"
  ).length;

  return {
    uploadResults: uploadResults.success,
    analysisQueued,
  };
}

export default AsyncProcessingPipeline;
