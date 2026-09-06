import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchMelhorEnvio, getPlatformMelhorEnvioAccountId } from "./melhor-envio-oauth";

export type ShippingQuote = {
  id: number;
  name: string;
  company: string;
  price: number;
  deliveryTime?: number;
};

function digits(v: string) {
  return v.replace(/\D/g, "");
}

export async function quoteShipping(
  accountId: string,
  destinationCep: string,
  items: { productId: string; quantity: number }[]
): Promise<ShippingQuote[]> {
  const admin = createAdminClient();

  const { data: account } = await admin
    .from("accounts")
    .select("shipping_origin_cep, default_package_weight, default_package_width, default_package_height, default_package_length")
    .eq("id", accountId)
    .maybeSingle();

  const originCep = digits(account?.shipping_origin_cep || "");
  const toCep = digits(destinationCep);
  if (originCep.length !== 8) throw new Error("Essa loja ainda não configurou o CEP de origem do frete.");
  if (toCep.length !== 8) throw new Error("Informe um CEP válido.");
  if (!items.length) throw new Error("Carrinho vazio.");

  const { data: products } = await admin
    .from("products")
    .select("id, name, price, shipping_weight, shipping_width, shipping_height, shipping_length")
    .in(
      "id",
      items.map((i) => i.productId)
    );

  const defaultReady = [
    account?.default_package_weight,
    account?.default_package_width,
    account?.default_package_height,
    account?.default_package_length,
  ].every((v) => Number(v || 0) > 0);

  const meProducts = items.map((item) => {
    const product = products?.find((p) => p.id === item.productId);
    if (!product) throw new Error("Produto não encontrado.");

    const own = [product.shipping_weight, product.shipping_width, product.shipping_height, product.shipping_length].every(
      (v) => Number(v || 0) > 0
    );
    const weight = own ? Number(product.shipping_weight) : Number(account?.default_package_weight || 0);
    const width = own ? Number(product.shipping_width) : Number(account?.default_package_width || 0);
    const height = own ? Number(product.shipping_height) : Number(account?.default_package_height || 0);
    const length = own ? Number(product.shipping_length) : Number(account?.default_package_length || 0);

    if (!own && !defaultReady) {
      throw new Error(
        `O produto "${product.name}" não tem medidas de envio, e a loja não configurou um pacote padrão.`
      );
    }

    return {
      id: product.id,
      width,
      height,
      length,
      weight,
      insurance_value: Number(product.price || 0),
      quantity: item.quantity,
    };
  });

  const platformAccountId = await getPlatformMelhorEnvioAccountId();
  const response = await fetchMelhorEnvio(platformAccountId, "/api/v2/me/shipment/calculate", {
    method: "POST",
    body: JSON.stringify({
      from: { postal_code: originCep },
      to: { postal_code: toCep },
      products: meProducts,
      options: { receipt: false, own_hand: false },
    }),
  });

  const data = await response.json();
  if (!response.ok || !Array.isArray(data)) {
    throw new Error(data?.message || "Não foi possível calcular o frete agora.");
  }

  return data
    .flatMap((entry: { error?: string; id: number; name?: string; company?: { name?: string }; custom_price?: number; price?: number; custom_delivery_time?: number; delivery_time?: number }) => {
      if (entry.error) return [];
      const price = Number(entry.custom_price ?? entry.price);
      if (!Number.isFinite(price)) return [];
      const delivery = Number(entry.custom_delivery_time ?? entry.delivery_time);
      return [
        {
          id: Number(entry.id),
          name: String(entry.name || "Entrega"),
          company: String(entry.company?.name || "Transportadora"),
          price,
          deliveryTime: Number.isFinite(delivery) ? delivery : undefined,
        },
      ];
    })
    .sort((a, b) => a.price - b.price);
}
