import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

async function getDriveInfo(path: string) {
  try {
    // Special handling for root directory and system paths
    const isSystemPath =
      path === "/" ||
      path.startsWith("/System") ||
      path === "/Volumes/Macintosh HD";

    if (isSystemPath) {
      // Use df directly for system paths without trying to access the directory
      const dfOutput = await execAsync(`df -k "${path}"`);
      const dfLines = dfOutput.stdout.split("\n");
      if (dfLines.length < 2) {
        throw new Error("No drive information found for the specified path");
      }

      // Parse the df output (now in 1K blocks)
      const [filesystem, blocks, used, available, capacity] =
        dfLines[1].split(/\s+/);

      // Convert sizes from 1K blocks to GB with higher precision
      const convertKBtoGB = (kb: string) => {
        const bytes = parseInt(kb) * 1024;
        return Math.round((bytes / (1024 * 1024 * 1024)) * 100) / 100;
      };

      // Try to get the actual volume name using diskutil
      let volumeName = "Macintosh HD"; // Default fallback
      try {
        // Get the mount point from df output to find the correct volume
        const mountPoint = dfLines[1].split(/\s+/).pop() || "/";

        // Get info about the mounted volume
        const diskutilOutput = await execAsync(`diskutil info "${mountPoint}"`);
        const diskutilLines = diskutilOutput.stdout.split("\n");

        // Find the volume name
        for (const line of diskutilLines) {
          if (line.includes("Volume Name:")) {
            const extractedName = line.split(":")[1]?.trim();
            if (extractedName) {
              volumeName = extractedName;
              break;
            }
          }
        }
      } catch (error) {
        console.warn(
          "Failed to get volume name from diskutil, using default name",
          error
        );
      }

      // For system paths, return basic information without trying to access the directory
      return {
        filesystem,
        systemName: volumeName,
        mountPoint: path,
        capacity: {
          total: convertKBtoGB(blocks),
          used: convertKBtoGB(used),
          available: convertKBtoGB(available),
          percentUsed: parseInt(capacity),
        },
        driveType: {
          mediaType: "System Drive",
          isSSD: true, // Most modern Macs use SSDs
          isRemovable: false,
          locationId: "internal", // Default locationId for internal drives
        },
        interface: "Internal",
        security: {
          hasHardwareAES: true,
          isEncrypted: true, // Most modern Macs use FileVault
        },
        fileSystem: {
          type: "APFS",
          isReadOnly: true,
        },
      };
    }

    // First, check if the path exists and is accessible
    await execAsync(`ls "${path}"`);

    // Try to get drive information using df first
    const dfOutput = await execAsync(`df -k "${path}"`);
    const dfLines = dfOutput.stdout.split("\n");
    if (dfLines.length < 2) {
      throw new Error("No drive information found for the specified path");
    }

    // Parse the df output (now in 1K blocks)
    // Filesystem     1K-blocks      Used    Available Use% Mounted on
    const [filesystem, blocks, used, available, capacity, mountPoint] =
      dfLines[1].split(/\s+/);

    // Convert sizes from 1K blocks to GB with higher precision
    const convertKBtoGB = (kb: string) => {
      const bytes = parseInt(kb) * 1024; // Convert to bytes
      return Math.round((bytes / (1024 * 1024 * 1024)) * 100) / 100; // Convert to GB with 2 decimal places
    };

    // Check if this is a network drive by looking at the filesystem type
    const isNetworkDrive =
      filesystem.includes("://") || filesystem.startsWith("//");

    let driveInfo;

    if (!isNetworkDrive) {
      try {
        // For local drives, try to get additional info from diskutil
        const diskutilOutput = await execAsync(`diskutil info "${path}"`);
        const diskutilLines = diskutilOutput.stdout.split("\n");

        let volumeName = "";
        let mediaType = "";
        let protocol = "";
        let deviceLocation = "";
        let isRemovable = false;
        let isSSD = false;
        let hasHardwareAES = false;
        let isEncrypted = false;
        let fileSystem = "";
        let isReadOnly = false;

        for (const line of diskutilLines) {
          const trimmedLine = line.trim();
          if (line.includes("Volume Name:"))
            volumeName = line.split(":")[1].trim();
          if (line.includes("Media Type:"))
            mediaType = line.split(":")[1].trim();
          if (line.includes("Protocol:")) protocol = line.split(":")[1].trim();
          if (line.includes("Device Location:"))
            deviceLocation = line.split(":")[1].trim();
          if (line.includes("Removable Media:"))
            isRemovable = line.split(":")[1].trim() !== "Fixed";
          if (line.includes("Solid State:"))
            isSSD = line.split(":")[1].trim() === "Yes";
          if (line.includes("Hardware AES Support:"))
            hasHardwareAES = line.split(":")[1].trim() === "Yes";
          if (line.includes("Encrypted:"))
            isEncrypted = line.split(":")[1].trim() === "Yes";
          if (line.includes("File System Personality:"))
            fileSystem = line.split(":")[1].trim();
          if (line.includes("Volume Read-Only:"))
            isReadOnly = line.split(":")[1].trim().startsWith("Yes");
        }

        driveInfo = {
          filesystem,
          systemName: volumeName || mountPoint.split("/").pop() || filesystem,
          mountPoint,
          capacity: {
            total: convertKBtoGB(blocks),
            used: convertKBtoGB(used),
            available: convertKBtoGB(available),
            percentUsed: parseInt(capacity),
          },
          driveType: {
            mediaType,
            isSSD,
            isRemovable,
            locationId: deviceLocation,
          },
          interface: protocol,
          security: {
            hasHardwareAES,
            isEncrypted,
          },
          fileSystem: {
            type: fileSystem,
            isReadOnly,
          },
        };
      } catch (error) {
        console.warn("Failed to get diskutil info, falling back to basic info");
        driveInfo = await getBasicDriveInfo(
          path,
          filesystem,
          blocks,
          used,
          available,
          capacity,
          mountPoint
        );
      }
    } else {
      // For network drives, return basic information
      driveInfo = await getBasicDriveInfo(
        path,
        filesystem,
        blocks,
        used,
        available,
        capacity,
        mountPoint
      );
    }

    return driveInfo;
  } catch (error) {
    console.error("Error getting drive info:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to get drive information: ${error.message}`
        : "Failed to get drive information"
    );
  }
}

async function getBasicDriveInfo(
  path: string,
  filesystem: string,
  blocks: string,
  used: string,
  available: string,
  capacity: string,
  mountPoint: string
) {
  const convertKBtoGB = (kb: string) => {
    const bytes = parseInt(kb) * 1024;
    return Math.round((bytes / (1024 * 1024 * 1024)) * 100) / 100;
  };

  // Try to get the network protocol if it's a network drive
  let protocol = "Unknown";
  if (filesystem.startsWith("smb")) protocol = "SMB";
  else if (filesystem.startsWith("afp")) protocol = "AFP";
  else if (filesystem.startsWith("nfs")) protocol = "NFS";

  return {
    filesystem,
    systemName: mountPoint.split("/").pop() || filesystem,
    mountPoint,
    capacity: {
      total: convertKBtoGB(blocks),
      used: convertKBtoGB(used),
      available: convertKBtoGB(available),
      percentUsed: parseInt(capacity),
    },
    driveType: {
      mediaType: "Network Share",
      isSSD: false,
      isRemovable: false,
      locationId: filesystem,
    },
    interface: protocol,
    security: {
      hasHardwareAES: false,
      isEncrypted: false,
    },
    fileSystem: {
      type: "Network Share",
      isReadOnly: false,
    },
  };
}

export async function GET(request: Request) {
  try {
    let path: string | null = null;

    try {
      const { searchParams } = new URL(request.url);
      path = searchParams.get("path");
    } catch (urlError) {
      console.error("Error parsing URL:", urlError, request.url);
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (!path) {
      return NextResponse.json(
        { error: "Path parameter is required" },
        { status: 400 }
      );
    }

    // Only modify paths that aren't the root or system paths
    const drivePath =
      path === "/" || path.startsWith("/System")
        ? path
        : path.startsWith("/Volumes/")
        ? path
        : `/Volumes/${path}`;

    const driveInfo = await getDriveInfo(drivePath);
    return NextResponse.json(driveInfo);
  } catch (error) {
    console.error("Error in drive info endpoint:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get drive information",
      },
      { status: 500 }
    );
  }
}
