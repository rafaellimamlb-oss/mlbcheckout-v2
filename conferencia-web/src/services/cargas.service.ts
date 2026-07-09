import { supabase } from "@/lib/supabaseClient";
import type { Produto } from "@/types/produto";

interface CargaProdutoImport {
  line: number;
  codigo_erp: string;
  descricao: string;
  quantidade_prevista: number;
}

export async function createCarga(numero_carga: string) {
  const { data, error } = await supabase
    .from("cargas")
    .insert({ numero_carga })
    .select()
    .single();

  return { data, error };
}

export async function importCargaProdutos(cargaId: string, products: CargaProdutoImport[]) {
  const codigoErps = products.map((product) => product.codigo_erp);
  const { data: productRows, error: productError } = await supabase
    .from<Produto>("products")
    .select("id, codigo_erp, ean13")
    .in("codigo_erp", codigoErps);

  if (productError) {
    return { data: null, error: productError };
  }

  const productMap = new Map(productRows?.map((product) => [product.codigo_erp, product]));

  const cargaProdutos = products.map((product) => {
    const matched = productMap.get(product.codigo_erp);
    if (!matched) {
      throw new Error(`Produto não cadastrado para Código ERP ${product.codigo_erp} na linha ${product.line}`);
    }
    if (!matched.id || !matched.ean13) {
      throw new Error(`Produto inválido cadastrado para Código ERP ${product.codigo_erp} na linha ${product.line}`);
    }

    return {
      carga_id: cargaId,
      produto_id: matched.id,
      codigo_erp: product.codigo_erp,
      ean13: matched.ean13,
      descricao: product.descricao,
      quantidade_prevista: product.quantidade_prevista,
    };
  });

  const { data, error } = await supabase.from("carga_produtos").insert(cargaProdutos);
  return { data, error };
}

export async function getCarga(numero_carga: string) {
  const { data, error } = await supabase
    .from("cargas")
    .select("*")
    .eq("numero_carga", numero_carga)
    .single();

  return { data, error };
}

export async function getProdutosCarga(cargaId: string) {
  const { data, error } = await supabase
    .from("carga_produtos")
    .select("*")
    .eq("carga_id", cargaId);

  return { data, error };
}
