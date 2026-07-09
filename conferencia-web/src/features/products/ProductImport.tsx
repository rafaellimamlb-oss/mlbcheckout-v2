import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { importProducts } from "@/services/products.service";
import type { Produto } from "@/types/produto";
import { Button } from "@/components/ui/button";

interface ProductImportProps {
  onImport: () => void;
}

export default function ProductImport({ onImport }: ProductImportProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setError(null);
    setInfoMessage(null);
    setRecordCount(0);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    resetState();
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx")) {
      setError("Apenas arquivos .xlsx são permitidos.");
      return;
    }

    setSelectedFile(file);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { header: 1 });
      const [header, ...values] = rows;
      if (!header || header.length < 4) {
        setError("Formato de planilha inválido. Use as colunas corretas.");
        setSelectedFile(null);
        return;
      }

      const expectedHeaders = ["Código ERP", "EAN13", "Descrição", "Unidade"];
      const actualHeaders = header.map((cell) => String(cell).trim());
      const validHeaders = expectedHeaders.every((value, index) => actualHeaders[index] === value);
      if (!validHeaders) {
        setError("Cabeçalhos esperados: Código ERP, EAN13, Descrição, Unidade.");
        setSelectedFile(null);
        return;
      }

      setRecordCount(values.length);
      setInfoMessage(`${values.length} registro(s) encontrados para importação.`);
    } catch (error) {
      setError("Não foi possível ler o arquivo Excel.");
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError("Selecione um arquivo antes de importar.");
      return;
    }

    setError(null);
    setInfoMessage("Importando produtos...");
    setLoading(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
      const [, ...values] = rows;

      const products: Omit<Produto, "id" | "created_at">[] = values
        .map((row) => {
          const [codigo_erp, ean13, descricao, unidade] = row;
          if (!codigo_erp || !ean13 || !descricao) return null;

          return {
            codigo_erp: String(codigo_erp).trim(),
            ean13: String(ean13).trim(),
            descricao: String(descricao).trim(),
            unidade: unidade ? String(unidade).trim() : "",
            ativo: true,
          };
        })
        .filter((item): item is Omit<Produto, "id" | "created_at"> => item !== null);

      const { error } = await importProducts(products);
      if (error) {
        setError(`Erro ao importar produtos: ${error.message}`);
        setInfoMessage(null);
      } else {
        setInfoMessage(`Produtos importados com sucesso: ${products.length} registro(s)`);
        setSelectedFile(null);
        setRecordCount(products.length);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
        onImport();
      }
    } catch (error) {
      setError("Erro desconhecido durante a importação.");
      setInfoMessage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Importação de Produtos</h2>
          <p className="text-sm text-muted-foreground">Importe produtos a partir de Excel com as colunas necessárias.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="cursor-pointer rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Selecionar arquivo
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="sr-only"
              disabled={loading}
            />
          </label>
          <Button onClick={handleImport} disabled={!selectedFile || loading}>
            {loading ? "Importando produtos..." : "Importar"}
          </Button>
        </div>
      </div>

      {selectedFile && <p className="text-sm text-foreground">Arquivo selecionado: {selectedFile.name}</p>}
      {recordCount > 0 && !loading && <p className="text-sm text-muted-foreground">Registros encontrados: {recordCount}</p>}
      {infoMessage && <p className="text-sm text-success mt-2">{infoMessage}</p>}
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
}
