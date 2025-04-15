import { analyzeImage } from "./imageAnalyzer";

export interface UploadProgressCallback {
  (
    fileId: string,
    progress: number,
    status: "uploading" | "analyzing" | "complete" | "error",
    error?: string
  ): void;
  (overallProgress: number): void;
}

export async function handleImageUploads(
  files: File[],
  onProgress: UploadProgressCallback,
  uploadEndpoint: string
) {
  const totalFiles = files.length;
  let completedFiles = 0;

  const updateOverallProgress = () => {
    const overallProgress = (completedFiles / totalFiles) * 100;
    onProgress(overallProgress);
  };

  const uploadPromises = files.map(async (file) => {
    const fileId = Math.random().toString(36).substr(2, 9);

    try {
      // Start upload
      onProgress(fileId, 0, "uploading");

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);

      // Upload the file
      const uploadResponse = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { url } = await uploadResponse.json();
      onProgress(fileId, 50, "analyzing");

      // Analyze the uploaded image
      const analysisResult = await analyzeImage(url);

      // Update progress to complete
      onProgress(fileId, 100, "complete");
      completedFiles++;
      updateOverallProgress();

      return {
        url,
        metadata: {
          ...analysisResult,
          filename: file.name,
        },
      };
    } catch (error) {
      onProgress(
        fileId,
        0,
        "error",
        error instanceof Error ? error.message : "Upload failed"
      );
      throw error;
    }
  });

  return Promise.all(uploadPromises);
}
