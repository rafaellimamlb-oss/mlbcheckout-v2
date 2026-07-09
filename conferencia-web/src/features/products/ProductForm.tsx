import { useState } from "react";
import type { Produto } from "@/types/produto";

interface ProductFormProps {
  initialValues?: Produto;
  onSubmit: (product: Omit<Produto, "id" | "created_at">) => void;
}

export default function ProductForm({ initialValues, onSubmit }: ProductFormProps) {
  const [codigoErp, setCodigoErp] = useState(initialValues?.codigo_erp ?? "");
  const [ean13, setEan13] = useState(initialValues?.ean13 ?? "");
  const [descricao, setDescricao] = useState(initialValues?.descricao ?? "");
  const [unidade, setUnidade] = useState(initialValues?.unidade ?? "");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      codigo_erp: codigoErp,
      ean13,
      descricao,
      unidade,
      ativo: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código ERP</label>
        <input
          value={codigoErp}
          onChange={(event) => setCodigoErp(event.target.value)}
          className="mt-1 w-full rounded-md border border-input px-3 py-2 bg-background text-foreground"
          required
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">EAN13</label>
        <input
          value={ean13}
          onChange={(event) => setEan13(event.target.value)}
          className="mt-1 w-full rounded-md border border-input px-3 py-2 bg-background text-foreground"
          required
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descrição</label>
        <input
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          className="mt-1 w-full rounded-md border border-input px-3 py-2 bg-background text-foreground"
          required
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unidade</label>
        <input
          value={unidade}
          onChange={(event) => setUnidade(event.target.value)}
          className="mt-1 w-full rounded-md border border-input px-3 py-2 bg-background text-foreground"
        />
      </div>
      <button type="submit" className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
        Salvar Produto
      </button>
    </form>
  );
}
