import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createCarga, importCargaProdutos } from "@/services/cargas.service";
import { Button } from "@/components/ui/button";

interface CargaRow {
  numero_carga: string;
  codigo_erp: string;
  descricao: string;
  quantidade: number;
}

export default function CargaImport() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [numeroCarga, setNumeroCarga] = useState<string>("");

  const resetState = () => {
    setError(null);
    setInfoMessage(null);
    setRecordCount(0);
    setNumeroCarga("");
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

      const expectedHeaders = ["Nº Carga", "Código Produto", "Descrição", "Quantidade"];
      const actualHeaders = header.map((cell) => String(cell).trim());
      const validHeaders = expectedHeaders.every((value, index) => actualHeaders[index] === value);
      if (!validHeaders) {
        setError("Cabeçalhos esperados: Nº Carga, Código Produto, Descrição, Quantidade.");
        setSelectedFile(null);
        return;
      }

      const parsedRows = values.map((row, index) => {
        const [numero_carga, codigo_erp, descricao, quantidade] = row as string[];
        return {
          line: index + 2,
          numero_carga: String(numero_carga ?? "").trim(),
          codigo_erp: String(codigo_erp ?? "").trim(),
          descricao: String(descricao ?? "").trim(),
          quantidade: quantidade === undefined || quantidade === null ? "" : String(quantidade).trim(),
        };
      });

      if (parsedRows.length === 0) {
        setError("O arquivo não contém registros de carga.");
        setSelectedFile(null);
        return;
      }

      let validCarga = "";
      for (const row of parsedRows) {
        if (!row.numero_carga) {
          setError(`Nº Carga obrigatório na linha ${row.line}.`);
          setSelectedFile(null);
          return;
        }
        if (!row.codigo_erp) {
          setError(`Código Produto obrigatório na linha ${row.line}.`);
          setSelectedFile(null);
          return;
        }
        if (!row.descricao) {
          setError(`Descrição obrigatória na linha ${row.line}.`);
          setSelectedFile(null);
          return;
        }
        const qtd = Number(row.quantidade);
        if (Number.isNaN(qtd) || qtd < 0) {
          setError(`Quantidade inválida na linha ${row.line}.`);
          setSelectedFile(null);
          return;
        }
        if (!validCarga) {
          validCarga = row.numero_carga;
        }
        if (row.numero_carga !== validCarga) {
          setError(`Todas as linhas devem pertencer à mesma carga. Linha ${row.line} possui carga diferente.`);
          setSelectedFile(null);
          return;
        }
      }

      setRecordCount(parsedRows.length);
      setNumeroCarga(validCarga);
      setInfoMessage(`${parsedRows.length} registro(s) prontos para importação.`);
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
    if (!numeroCarga) {
      setError("Número da carga não identificado.");
      return;
    }

    setError(null);
    setInfoMessage("Importando carga...");
    setLoading(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
      const [, ...values] = rows;

      const products = values.map((row, index) => {
        const [numero_carga, codigo_erp, descricao, quantidade] = row;
        return {
          line: index + 2,
          codigo_erp: String(codigo_erp ?? "").trim(),
          descricao: String(descricao ?? "").trim(),
          quantidade_prevista: Number(quantidade),
        };
      });

      const cargaResult = await createCarga(numeroCarga);
      if (cargaResult.error || !cargaResult.data) {
        setError(`Erro ao criar carga: ${cargaResult.error?.message ?? "Erro desconhecido."}`);
        setInfoMessage(null);
        return;
      }

      const { data: cargaData } = cargaResult;
      const { data: importData, error: importError } = await importCargaProdutos(cargaData.id, products);

      if (importError) {
        setError(`Erro ao importar carga: ${importError.message}`);
        setInfoMessage(null);
        return;
      }

      setInfoMessage(`Carga importada com sucesso: ${products.length} registro(s)`);
      setSelectedFile(null);
      setRecordCount(products.length);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      setError(`Erro desconhecido durante a importação.`);
      setInfoMessage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Importação de Carga</h2>
          <p className="text-sm text-muted-foreground">Importe cargas via Excel com Nº Carga, Código Produto, Descrição e Quantidade.</p>
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
            {loading ? "Importando carga..." : "Importar carga"}
          </Button>
        </div>
      </div>

      {selectedFile && <p className="text-sm text-foreground">Arquivo selecionado: {selectedFile.name}</p>}
      {numeroCarga && <p className="text-sm text-muted-foreground">Nº Carga: {numeroCarga}</p>}
      {recordCount > 0 && !loading && <p className="text-sm text-muted-foreground">Registros carregados: {recordCount}</p>}
      {infoMessage && <p className="text-sm text-success mt-2">{infoMessage}</p>}
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
}
