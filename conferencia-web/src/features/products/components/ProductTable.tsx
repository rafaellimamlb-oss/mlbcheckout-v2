import type { Produto } from "@/types/produto";

interface ProductTableProps {
  products: Produto[];
  loading: boolean;
}

export default function ProductTable({ products, loading }: ProductTableProps) {
  if (loading) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Carregando produtos...</div>;
  }

  if (products.length === 0) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Nenhum produto encontrado.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Código ERP</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">EAN13</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Descrição</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Unidade</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ativo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 font-mono">{product.codigo_erp}</td>
              <td className="px-4 py-3 font-mono">{product.ean13}</td>
              <td className="px-4 py-3">{product.descricao}</td>
              <td className="px-4 py-3">{product.unidade || "-"}</td>
              <td className="px-4 py-3">{product.ativo ? "Sim" : "Não"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
