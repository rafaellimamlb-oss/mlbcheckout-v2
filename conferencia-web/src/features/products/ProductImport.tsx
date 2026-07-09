import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createProduct, listProducts } from "@/services/products.service";
import type { Produto } from "@/types/produto";
import { Button } from "@/components/ui/button";

interface ProductImportProps {
  onImport: () => void;
}

export default function ProductImport({ onImport }: ProductImportProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { header: 1 });

    const [header, ...values] = rows;
    if (!header || header.length < 4) {
      setError("Formato de planilha inválido. Use as colunas corretas.");
      return;
    }

    const expectedHeaders = ["Código ERP", "EAN13", "Descrição", "Unidade"];
    const actualHeaders = header.map((cell) => String(cell).trim());
    const validHeaders = expectedHeaders.every((value, index) => actualHeaders[index] === value);
    if (!validHeaders) {
      setError("Cabeçalhos esperados: Código ERP, EAN13, Descrição, Unidade.");
      return;
    }

    setLoading(true);
    for (const row of values) {
      const [codigo_erp, ean13, descricao, unidade] = row as string[];
      if (!codigo_erp || !ean13 || !descricao) continue;

      const product: Omit<Produto, "id" | "created_at"> = {
        codigo_erp: String(codigo_erp).trim(),
        ean13: String(ean13).trim(),
        descricao: String(descricao).trim(),
        unidade: unidade ? String(unidade).trim() : "",
        ativo: true,
      };

      await createProduct(product);
    }

    setLoading(false);
    onImport();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Importação de Produtos</h2>
          <p className="text-sm text-muted-foreground">Importe produtos a partir de Excel com as colunas necessárias.</p>
        </div>
        <label className="cursor-pointer rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          {loading ? "Importando..." : "Selecionar arquivo"}
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileChange}
            className="sr-only"
            disabled={loading}
          />
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
