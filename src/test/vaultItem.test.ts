import { describe, expect, it } from "vitest";
import { newItem, normalizeToV2, type ItemPayload } from "@/lib/vaultItem";

describe("normalizeToV2", () => {
  it("maps a legacy fixed-shape item to fields, dropping empty values", () => {
    const legacy = {
      title: "Hosting",
      username: "admin",
      password: "s3cr3t",
      url: "https://panel.example.com",
      notes: "",
    };

    const result = normalizeToV2(legacy);

    expect(result.version).toBe(2);
    expect(result.title).toBe("Hosting");
    // notes was empty → dropped; the other three kept in order.
    expect(result.fields.map((f) => f.type)).toEqual(["username", "password", "url"]);
    expect(result.fields.map((f) => f.value)).toEqual(["admin", "s3cr3t", "https://panel.example.com"]);
    expect(result.fields.every((f) => typeof f.id === "string" && f.id.length > 0)).toBe(true);
  });

  it("returns a V2 item unchanged (idempotent)", () => {
    const v2: ItemPayload = {
      version: 2,
      title: "API",
      fields: [{ id: "abc", type: "text", label: "Token", value: "xyz" }],
    };

    expect(normalizeToV2(v2)).toBe(v2);
    // a round-trip through a fresh item is also stable
    expect(normalizeToV2(newItem())).toMatchObject({ version: 2 });
  });

  it("falls back to a placeholder for garbage / null input", () => {
    for (const bad of [null, undefined, "not json", 42]) {
      const result = normalizeToV2(bad);
      expect(result.title).toBe("(no se pudo descifrar)");
      expect(result.fields).toEqual([]);
    }
  });
});
