import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { KpiCard } from "@/components/KpiCard";

describe("KpiCard value sizing", () => {
  it("shrinks the font for a long formatted currency value (regression: costos de ads)", () => {
    const { container } = render(
      <KpiCard label="Costos de Ads" value={5195929.57} prefix="US$ " decimals={2} />
    );
    const valueEl = container.querySelector(".animate-counter");
    expect(valueEl).toBeTruthy();
    // No debe quedar en el tamaño grande por defecto (text-3xl) para un
    // número de este largo — así es como se cortaba contra el borde de la card.
    expect(valueEl?.className).not.toContain("text-3xl");
    expect(valueEl?.className).toContain("text-xl");
  });

  it("keeps the large default size for short values", () => {
    const { container } = render(<KpiCard label="Leads" value={42} />);
    const valueEl = container.querySelector(".animate-counter");
    expect(valueEl?.className).toContain("text-3xl");
  });
});
