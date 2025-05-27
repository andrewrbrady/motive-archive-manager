/**
 * Utility for cleaning up URL parameters based on the current context
 *
 * This helps prevent parameters from one section of the app affecting another section
 * by defining which parameters are valid in each context.
 */

// Cache for context mappings to improve performance
const contextMapCache = new Map<string, string[]>();

// Define parameter contexts - which parameters are valid in each context
const getContextMap = (): Record<string, string[]> => {
  return {
    // Car page tab contexts
    "tab:gallery": ["tab"],
    "tab:car-galleries": ["tab"],
    "tab:specs": ["tab"],
    "tab:shoots": ["tab"],
    "tab:shot-lists": ["tab", "template"],
    "tab:scripts": ["tab", "template"],
    "tab:bat": ["tab"],
    "tab:copywriter": ["tab"],
    "tab:service": ["tab"],
    "tab:research": ["tab"],
    "tab:documentation": ["tab"],
    "tab:article": ["tab"],
    "tab:deliverables": ["tab"],
    "tab:events": ["tab"],
    "tab:calendar": ["tab"],

    // Inventory tab contexts
    "tab:raw-assets": [
      "tab",
      "page",
      "limit",
      "search",
      "asset",
      "edit",
      "addAsset",
    ],
    "tab:upcoming": ["tab"],
    "tab:studio-inventory": [
      "tab",
      "page",
      "limit",
      "search",
      "category",
      "view",
      "item",
    ],
    "tab:hard-drives": [
      "tab",
      "page",
      "limit",
      "search",
      "drive",
      "location",
      "view",
      "createDrive",
      // "template" is explicitly NOT included here
    ],
    "tab:kits": ["tab", "page", "limit", "search", "status", "kit", "mode"],

    // Modal contexts
    "modal:asset-details": ["tab", "asset"],
    "modal:asset-edit": ["tab", "asset", "edit"],
    "modal:drive-details": ["tab", "drive"],
    "modal:kit-details": ["tab", "kit"],
    "modal:kit-edit": ["tab", "kit", "edit"],
    "modal:kit-checkout": ["tab", "kit", "mode"],
    "modal:create-drive": ["tab", "createDrive"],
    "modal:add-asset": ["tab", "addAsset"],

    // Default context - only preserve tab parameter
    default: ["tab"],
  };
};

/**
 * Clean up URL parameters based on the current context
 * @param currentParams Current URL parameters
 * @param context Current context (e.g., 'tab:hard-drives')
 * @returns Cleaned URLSearchParams object
 */
export function cleanupUrlParameters(
  currentParams: URLSearchParams,
  context: string
): URLSearchParams {
  // Create a new URLSearchParams object to avoid mutating the input
  const params = new URLSearchParams(currentParams.toString());

  // Fast path: if no params, return early
  if (params.size === 0) {
    return params;
  }

  // AGGRESSIVE CLEANUP: Special case for template parameter
  // If we're not in a template context, ALWAYS remove the template parameter immediately
  const isTemplateContext =
    context === "tab:shot-lists" || context === "tab:scripts";
  if (!isTemplateContext && params.has("template")) {
    params.delete("template");
  }

  // Get allowed parameters for the current context with caching
  let allowedParams = contextMapCache.get(context);
  if (!allowedParams) {
    const contextMap = getContextMap();
    allowedParams = contextMap[context] || contextMap["default"];
    contextMapCache.set(context, allowedParams);
  }

  // Special case for the hard-drives tab which seems problematic
  if (context === "tab:hard-drives" && params.has("template")) {
    params.delete("template");
  }

  // Batch removal of invalid parameters
  const keysToRemove: string[] = [];
  for (const key of params.keys()) {
    if (!allowedParams.includes(key)) {
      keysToRemove.push(key);
    }
  }

  // Remove all invalid parameters in one pass
  keysToRemove.forEach((key) => params.delete(key));

  // One final check to ensure template is gone in non-template contexts
  if (!isTemplateContext && params.has("template")) {
    params.delete("template");
  }

  return params;
}

/**
 * Get the current context based on URL parameters
 * @param params Current URL parameters
 * @returns The current context string
 */
export function getCurrentContext(params: URLSearchParams): string {
  const tab = params.get("tab");
  const template = params.get("template");

  // Determine if we're in a modal context
  const asset = params.get("asset");
  const drive = params.get("drive");
  const kit = params.get("kit");
  const edit = params.get("edit");
  const mode = params.get("mode");
  const createDrive = params.get("createDrive");
  const addAsset = params.get("addAsset");
  const item = params.get("item");

  // Check for modal contexts (order matters for specificity)
  if (asset && edit === "true") {
    return "modal:asset-edit";
  }
  if (asset) {
    return "modal:asset-details";
  }
  if (drive) {
    return "modal:drive-details";
  }
  if (kit && edit === "true") {
    return "modal:kit-edit";
  }
  if (kit && mode) {
    return "modal:kit-checkout";
  }
  if (kit) {
    return "modal:kit-details";
  }
  if (createDrive) {
    return "modal:create-drive";
  }
  if (addAsset) {
    return "modal:add-asset";
  }
  if (item) {
    return "modal:item-details";
  }

  // If template is present but no tab, default to shot-lists tab
  if (template && !tab) {
    return "tab:shot-lists";
  }

  // If not in a modal context, use the tab context
  return tab ? `tab:${tab}` : "default";
}
