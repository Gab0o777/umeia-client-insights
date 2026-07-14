import { describe, it, expect } from "vitest";
import { getBrandName } from "@/lib/whitelabel";

describe("getBrandName", () => {
  it("returns UMEIA for the default umeia.io subdomain", () => {
    expect(getBrandName("projects.umeia.io")).toBe("UMEIA");
  });

  it("returns UMEIA for an unmapped custom domain", () => {
    expect(getBrandName("app.algunclientequenoseteoconfiguro.com")).toBe("UMEIA");
  });

  it("returns the custom brand for an exact mapped domain", () => {
    expect(getBrandName("metodoclinico.com")).toBe("Metodo Clinico");
  });

  it("returns the custom brand for any subdomain of a mapped domain", () => {
    expect(getBrandName("x.metodoclinico.com")).toBe("Metodo Clinico");
    expect(getBrandName("app.metodoclinico.com")).toBe("Metodo Clinico");
  });

  it("does not match unrelated domains that merely contain the mapped domain as a substring", () => {
    expect(getBrandName("notmetodoclinico.com")).toBe("UMEIA");
    expect(getBrandName("metodoclinico.com.evil.net")).toBe("UMEIA");
  });

  it("is case-insensitive", () => {
    expect(getBrandName("X.METODOCLINICO.COM")).toBe("Metodo Clinico");
  });
});
