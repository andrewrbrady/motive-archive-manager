/**
 * Utility for cleaning up URL parameters based on the current context
 *
 * This helps prevent parameters from one section of the app affecting another section
 * by defining which parameters are valid in each context.
 */

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
  const params = new URLSearchParams(currentParams.toString());

  // Define parameter contexts - which parameters are valid in each context
  const contextMap: Record<string, string[]> = {
    // Tab contexts
    "tab:shot-lists": ["tab", "template"],
    "tab:scripts": ["tab", "template"],
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
      "template",
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

  // Get allowed parameters for the current context
  const allowedParams = contextMap[context] || contextMap["default"];

  // Remove parameters that aren't allowed in this context
  Array.from(params.keys()).forEach((key) => {
    if (!allowedParams.includes(key)) {
      params.delete(key);
    }
  });

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

  // Check for modal contexts
  if (asset && edit === "true") {
    return "modal:asset-edit";
  } else if (asset) {
    return "modal:asset-details";
  } else if (drive) {
    return "modal:drive-details";
  } else if (kit && edit === "true") {
    return "modal:kit-edit";
  } else if (kit && mode) {
    return "modal:kit-checkout";
  } else if (kit) {
    return "modal:kit-details";
  } else if (createDrive) {
    return "modal:create-drive";
  } else if (addAsset) {
    return "modal:add-asset";
  } else if (item) {
    return "modal:item-details";
  }

  // If template is present but no tab, default to shot-lists tab
  if (template && !tab) {
    return "tab:shot-lists";
  }

  // If not in a modal context, use the tab context
  return tab ? `tab:${tab}` : "default";
}
