import { useEffect, useState } from "react";
import { listProducts } from "@/services/products.service";
import { ProductTable } from "./components/ProductTable";
import ProductImport from "./ProductImport";
import type { Produto } from "@/types/produto";

export default function ProductPage() {
  const [products, setProducts] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await listProducts();
    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h1 className="text-lg font-bold">Cadastro de Produtos</h1>
        <p className="text-sm text-muted-foreground">Estrutura inicial para gestão de produtos com EAN13.</p>
      </div>
      <ProductImport onImport={loadProducts} />
      <ProductTable products={products} loading={loading} />
    </div>
  );
}
