const express = require("express");
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "canvas-extension" });
});

// Canvas extension endpoint
app.post("/extend-canvas", async (req, res) => {
  const {
    imageUrl,
    desiredHeight,
    paddingPct = 0.05,
    whiteThresh = -1,
  } = req.body;

  // Validate input parameters
  if (!imageUrl || !desiredHeight) {
    return res.status(400).json({
      error: "Missing required parameters: imageUrl and desiredHeight",
    });
  }

  if (desiredHeight < 100 || desiredHeight > 5000) {
    return res.status(400).json({
      error: "Desired height must be between 100 and 5000 pixels",
    });
  }

  if (paddingPct < 0 || paddingPct > 1) {
    return res.status(400).json({
      error: "Padding percentage must be between 0 and 1",
    });
  }

  if (whiteThresh !== -1 && (whiteThresh < 0 || whiteThresh > 255)) {
    return res.status(400).json({
      error: "White threshold must be -1 or between 0 and 255",
    });
  }

  const tempDir = "/tmp/canvas-extension";
  const sessionId = uuidv4();
  const inputPath = path.join(tempDir, `input_${sessionId}.jpg`);
  const outputPath = path.join(tempDir, `output_${sessionId}.jpg`);

  try {
    // Ensure temp directory exists
    await fs.mkdir(tempDir, { recursive: true });

    // Download the image
    console.log(`Downloading image from: ${imageUrl}`);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(imageBuffer));

    // Check if extend_canvas executable exists
    const executablePath = path.join("/app", "extend_canvas");
    try {
      await fs.access(executablePath);
    } catch {
      throw new Error("Canvas extension binary not found");
    }

    // Build command arguments
    const args = [
      inputPath,
      outputPath,
      desiredHeight.toString(),
      paddingPct.toString(),
      whiteThresh.toString(),
    ];

    // Execute the C++ program
    const command = `${executablePath} ${args.join(" ")}`;
    console.log("Executing command:", command);

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
      });

      if (stderr) {
        console.warn("Canvas extension stderr:", stderr);
      }

      console.log("Canvas extension stdout:", stdout);
    } catch (execError) {
      console.error("Canvas extension execution error:", execError);
      throw new Error(`Canvas extension failed: ${execError.message}`);
    }

    // Check if output file was created
    try {
      await fs.access(outputPath);
    } catch {
      throw new Error("Output image was not generated");
    }

    // Read the processed image
    const processedImageBuffer = await fs.readFile(outputPath);

    // Convert to base64
    const base64Image = processedImageBuffer.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Clean up temporary files
    await Promise.all([
      fs.unlink(inputPath).catch(() => {}),
      fs.unlink(outputPath).catch(() => {}),
    ]);

    console.log(`Successfully processed image: ${imageUrl}`);

    res.json({
      success: true,
      processedImageUrl: dataUrl,
      message: "Image processed successfully with C++ OpenCV",
      metadata: {
        originalUrl: imageUrl,
        desiredHeight,
        paddingPct,
        whiteThresh,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Canvas extension error:", error);

    // Clean up temporary files on error
    await Promise.all([
      fs.unlink(inputPath).catch(() => {}),
      fs.unlink(outputPath).catch(() => {}),
    ]);

    if (error.message.includes("timeout")) {
      return res.status(408).json({
        error: "Processing timeout. The image may be too large or complex.",
      });
    }

    res.status(500).json({
      error: error.message || "An unexpected error occurred",
    });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Canvas Extension Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Canvas extension: POST http://localhost:${PORT}/extend-canvas`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully");
  process.exit(0);
});
