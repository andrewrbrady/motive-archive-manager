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
  res.json({ status: "healthy", service: "canvas-extension-and-matte" });
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

// Image matte creation endpoint
app.post("/create-matte", async (req, res) => {
  const {
    imageUrl,
    canvasWidth,
    canvasHeight,
    paddingPercent = 0,
    matteColor = "#000000",
  } = req.body;

  // Validate input parameters
  if (!imageUrl || !canvasWidth || !canvasHeight) {
    return res.status(400).json({
      error:
        "Missing required parameters: imageUrl, canvasWidth, and canvasHeight",
    });
  }

  if (canvasWidth < 100 || canvasWidth > 5000) {
    return res.status(400).json({
      error: "Canvas width must be between 100 and 5000 pixels",
    });
  }

  if (canvasHeight < 100 || canvasHeight > 5000) {
    return res.status(400).json({
      error: "Canvas height must be between 100 and 5000 pixels",
    });
  }

  if (paddingPercent < 0 || paddingPercent > 50) {
    return res.status(400).json({
      error: "Padding percentage must be between 0 and 50",
    });
  }

  // Validate hex color format
  if (!/^#[0-9A-F]{6}$/i.test(matteColor)) {
    return res.status(400).json({
      error: "Matte color must be a valid hex color (e.g., #000000)",
    });
  }

  const tempDir = "/tmp/image-matte";
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

    // Check if matte_generator executable exists
    const executablePath = path.join("/app", "matte_generator");
    try {
      await fs.access(executablePath);
    } catch {
      throw new Error("Matte generator binary not found");
    }

    // Build command arguments with proper shell escaping
    const escapeShellArg = (arg) => {
      // Escape single quotes and wrap in single quotes
      return `'${arg.replace(/'/g, "'\"'\"'")}'`;
    };

    const args = [
      "--input",
      escapeShellArg(inputPath),
      "--output",
      escapeShellArg(outputPath),
      "--width",
      canvasWidth.toString(),
      "--height",
      canvasHeight.toString(),
      "--padding",
      paddingPercent.toString(),
      "--color",
      escapeShellArg(matteColor),
    ];

    // Execute the C++ program with proper shell escaping
    const command = `${escapeShellArg(executablePath)} ${args.join(" ")}`;
    console.log("Executing command:", command);

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
      });

      if (stderr) {
        console.warn("Matte generator stderr:", stderr);
      }

      console.log("Matte generator stdout:", stdout);
    } catch (execError) {
      console.error("Matte generator execution error:", execError);
      throw new Error(`Matte generation failed: ${execError.message}`);
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

    console.log(`Successfully created matte for image: ${imageUrl}`);

    res.json({
      success: true,
      processedImageUrl: dataUrl,
      message: "Image matte created successfully with C++ OpenCV",
      metadata: {
        originalUrl: imageUrl,
        canvasWidth,
        canvasHeight,
        paddingPercent,
        matteColor,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Image matte error:", error);

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
  console.log(`Canvas Extension and Matte Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Canvas extension: POST http://localhost:${PORT}/extend-canvas`);
  console.log(`Image matte: POST http://localhost:${PORT}/create-matte`);
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
