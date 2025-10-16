import { describe, expect, test } from "@jest/globals";
import {
  formatProjectStatus,
  getProjectStatusColor,
  KNOWN_PROJECT_STATUSES,
} from "@/utils/projectStatus";

describe("projectStatus utilities", () => {
  test("formatProjectStatus handles undefined and null", () => {
    expect(formatProjectStatus(undefined)).toBe("Unknown");
    expect(formatProjectStatus(null)).toBe("Unknown");
  });

  test("formatProjectStatus maps known statuses to readable labels", () => {
    expect(formatProjectStatus("draft")).toBe("Draft");
    expect(formatProjectStatus("active")).toBe("Active");
    expect(formatProjectStatus("in_review")).toBe("In Review");
    expect(formatProjectStatus("completed")).toBe("Completed");
    expect(formatProjectStatus("archived")).toBe("Archived");
  });

  test("formatProjectStatus sanitizes unknown string statuses", () => {
    expect(formatProjectStatus("needs_attention")).toBe("needs attention");
  });

  test("formatProjectStatus stringifies non-string values", () => {
    const numericStatus: any = 123;
    const objectStatus: any = { status: "active" };
    expect(formatProjectStatus(numericStatus)).toBe("123");
    expect(formatProjectStatus(objectStatus)).toBe("[object Object]");
  });

  test("getProjectStatusColor returns defaults for unknown statuses", () => {
    expect(getProjectStatusColor("draft")).toContain("bg-gray-100");
    expect(getProjectStatusColor("active")).toContain("bg-blue-100");
    expect(
      getProjectStatusColor("totally_unknown_status" as any)
    ).toBe("bg-gray-100 text-gray-800");
    expect(getProjectStatusColor(undefined)).toBe(
      "bg-gray-100 text-gray-800"
    );
  });

  test("KNOWN_PROJECT_STATUSES matches the expected set", () => {
    expect(new Set(KNOWN_PROJECT_STATUSES)).toEqual(
      new Set(["draft", "active", "in_review", "completed", "archived"])
    );
  });
});
