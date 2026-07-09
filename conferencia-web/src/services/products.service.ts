import { supabase } from "@/lib/supabaseClient";
import type { Produto } from "@/types/produto";

export async function getProductByEan13(ean13: string) {
  const { data, error } = await supabase.from<Produto>("products").select("*").eq("ean13", ean13).single();
  return { data, error };
}

export async function createProduct(product: Omit<Produto, "id" | "created_at">) {
  const { data, error } = await supabase.from<Produto>("products").insert(product).select().single();
  return { data, error };
}

export async function updateProduct(id: string, product: Partial<Omit<Produto, "id" | "created_at">>) {
  const { data, error } = await supabase.from<Produto>("products").update(product).eq("id", id).select().single();
  return { data, error };
}

export async function listProducts() {
  const { data, error } = await supabase.from<Produto>("products").select("*");
  return { data, error };
}
