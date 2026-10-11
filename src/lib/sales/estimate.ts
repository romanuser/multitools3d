// ---------------------------------------------------------------------
// Estima gramas, custo de filamento e tempo de UMA unidade de um produto
// do catálogo, a partir da receita de impressão dele — pra alimentar o
// mesmo cálculo do orçamento na Venda direta.
//
// Ordem de prioridade: multipartes > receita "por cor" > vários
// filamentos > um filamento. Sem receita = 0 g (o preço sugerido fica só
// com mão de obra + custos fixos).
// ---------------------------------------------------------------------
export type EstimateFilament = { id: string; material: string; color: string; cost_per_kg: number | null };

export type EstimateProduct = {
  print_filament_id: string | null;
  print_weight_g: number | null;
  print_time_min: number | null;
  color_filament_material: string | null;
  color_filament_grams: number | null;
  filament_rows?: { filament_stock_id: string; grams: number }[];
  parts?: { filament_stock_id: string | null; color_material: string | null; grams: number | null; print_time_min: number | null }[];
};

const norm = (s: string) => s.trim().toLowerCase();

export function estimateProduct(product: EstimateProduct, color: string | null, filaments: EstimateFilament[]) {
  const costOf = (id: string | null | undefined) => Number(filaments.find((f) => f.id === id)?.cost_per_kg || 0);

  // Material + cor do cliente: usa o rolo daquela cor; se não tiver (ou
  // ainda não escolheram a cor), a média do material.
  const costOfMaterial = (material: string) => {
    const exact = color ? filaments.find((f) => norm(f.material) === norm(material) && norm(f.color) === norm(color)) : null;
    if (exact) return Number(exact.cost_per_kg || 0);
    const same = filaments.filter((f) => norm(f.material) === norm(material));
    return same.length ? same.reduce((sum, f) => sum + Number(f.cost_per_kg || 0), 0) / same.length : 0;
  };

  if (product.parts?.length) {
    let grams = 0;
    let filamentCost = 0;
    for (const part of product.parts) {
      const g = Number(part.grams || 0);
      const perKg = part.color_material ? costOfMaterial(part.color_material) : costOf(part.filament_stock_id);
      grams += g;
      filamentCost += (g / 1000) * perKg;
    }
    const timeMin = product.parts.every((p) => p.print_time_min)
      ? product.parts.reduce((sum, p) => sum + (p.print_time_min || 0), 0)
      : product.print_time_min;
    return { grams, filamentCost, timeMin: timeMin ?? null, hasRecipe: true };
  }

  if (product.color_filament_material && product.color_filament_grams) {
    const g = Number(product.color_filament_grams);
    return {
      grams: g,
      filamentCost: (g / 1000) * costOfMaterial(product.color_filament_material),
      timeMin: product.print_time_min,
      hasRecipe: true,
    };
  }

  if (product.filament_rows?.length) {
    const grams = product.filament_rows.reduce((sum, r) => sum + Number(r.grams || 0), 0);
    const filamentCost = product.filament_rows.reduce(
      (sum, r) => sum + (Number(r.grams || 0) / 1000) * costOf(r.filament_stock_id),
      0
    );
    return { grams, filamentCost, timeMin: product.print_time_min, hasRecipe: true };
  }

  if (product.print_filament_id && product.print_weight_g) {
    const g = Number(product.print_weight_g);
    return {
      grams: g,
      filamentCost: (g / 1000) * costOf(product.print_filament_id),
      timeMin: product.print_time_min,
      hasRecipe: true,
    };
  }

  return { grams: 0, filamentCost: 0, timeMin: product.print_time_min, hasRecipe: false };
}
