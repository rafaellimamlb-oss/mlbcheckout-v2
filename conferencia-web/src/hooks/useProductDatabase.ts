import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useProductDatabase() {
  const [products, setProducts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("code, name");
    if (!error && data) {
      const map: Record<string, string> = {};
      data.forEach((p) => {
        map[p.code] = p.name;
      });
      setProducts(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const lookupProduct = useCallback((code: string) => products[code], [products]);

  return { products, loading, lookupProduct, refresh: fetchProducts };
}
