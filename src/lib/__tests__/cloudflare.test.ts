import { getFormattedImageUrl } from "../cloudflare";
import { describe, test, expect } from "@jest/globals";

describe("Cloudflare utility functions", () => {
  describe("getFormattedImageUrl", () => {
    test("should handle null or undefined URLs", () => {
      expect(getFormattedImageUrl(null)).toBe("");
      expect(getFormattedImageUrl(undefined)).toBe("");
    });

    test("should add /public to URLs without variants", () => {
      const url =
        "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abcdef-1234-5678";
      expect(getFormattedImageUrl(url)).toBe(`${url}/public`);
    });

    test("should replace existing variants with the specified one", () => {
      const baseUrl =
        "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abcdef-1234-5678";
      const withVariant = `${baseUrl}/thumbnail`;

      expect(getFormattedImageUrl(withVariant)).toBe(`${baseUrl}/public`);
      expect(getFormattedImageUrl(withVariant, "avatar")).toBe(
        `${baseUrl}/avatar`
      );
    });

    test("should leave non-Cloudflare URLs unchanged", () => {
      const regularUrl = "https://example.com/image.jpg";
      expect(getFormattedImageUrl(regularUrl)).toBe(regularUrl);
    });

    test("should handle empty string URLs", () => {
      expect(getFormattedImageUrl("")).toBe("");
    });

    test("should apply custom variants when specified", () => {
      const url =
        "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abcdef-1234-5678";
      expect(getFormattedImageUrl(url, "thumbnail")).toBe(`${url}/thumbnail`);
      expect(getFormattedImageUrl(url, "avatar")).toBe(`${url}/avatar`);
    });
  });
});
