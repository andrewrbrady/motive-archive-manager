// lib/fetchMakes.ts
import { getApiUrl } from "./utils";

export interface Make {
  _id: string;
  name: string;
  country_of_origin: string;
  founded: number;
  type: string[];
  parent_company: string;
  created_at: Date;
  updated_at: Date;
  active: boolean;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export async function fetchMakes() {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const url = getApiUrl("makes");
      console.log("Fetching makes from:", url);

      const response = await fetch(url, {
        // Add cache control headers
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        // Add credentials to handle auth
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch makes:", {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });

        if (retries < MAX_RETRIES - 1) {
          retries++;
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY * retries)
          );
          continue;
        }

        throw new Error(
          `Failed to fetch makes: ${response.status} ${response.statusText}`
        );
      }

      const makes = await response.json();
      return makes as Make[];
    } catch (error) {
      console.error("Error fetching makes:", error);

      if (retries < MAX_RETRIES - 1) {
        retries++;
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * retries)
        );
        continue;
      }

      throw error;
    }
  }

  throw new Error("Max retries exceeded when fetching makes");
}
