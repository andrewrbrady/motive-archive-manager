import fs from "fs";
import path from "path";

// Define batch interfaces locally
interface DeliverableTemplate {
  title: string;
  platform_id?: string;
  platform?: string; // Legacy field
  mediaTypeId?: string;
  type?: string; // Legacy field
  duration?: number;
  aspect_ratio: string;
  daysUntilDeadline?: number;
  daysUntilRelease?: number;
}

interface BatchTemplate {
  name: string;
  templates: DeliverableTemplate[];
}

const STORAGE_FILE = path.join(process.cwd(), "data", "batch-templates.json");

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read from file
function readFromFile(): Record<string, BatchTemplate> {
  try {
    ensureDataDir();
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn("Failed to read batch templates from file:", error);
  }

  // Return empty object if no file exists
  return {};
}

// Write to file
function writeToFile(data: Record<string, BatchTemplate>) {
  try {
    ensureDataDir();
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Failed to write batch templates to file:", error);
  }
}

// Initialize storage
let batchTemplates: Record<string, BatchTemplate> = readFromFile();

export const FileBatchStorage = {
  getAll(): BatchTemplate[] {
    return Object.values(batchTemplates);
  },

  get(name: string): BatchTemplate | undefined {
    return batchTemplates[name];
  },

  exists(name: string): boolean {
    return !!batchTemplates[name];
  },

  create(batch: BatchTemplate): void {
    batchTemplates[batch.name] = batch;
    writeToFile(batchTemplates);
  },

  update(oldName: string, batch: BatchTemplate): void {
    if (oldName !== batch.name) {
      delete batchTemplates[oldName];
    }
    batchTemplates[batch.name] = batch;
    writeToFile(batchTemplates);
  },

  delete(name: string): boolean {
    if (batchTemplates[name]) {
      delete batchTemplates[name];
      writeToFile(batchTemplates);
      return true;
    }
    return false;
  },

  // For debugging
  getAllRaw(): Record<string, BatchTemplate> {
    return batchTemplates;
  },
};
