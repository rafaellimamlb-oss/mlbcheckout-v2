import { useRef, useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useProductDatabase } from "@/hooks/useProductDatabase";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import {
  Trash2,
  ScanBarcode,
  PackageSearch,
  CheckCircle,
  Lock,
  FileSpreadsheet,
  RefreshCw,
  LogOut,
  X,
} from "lucide-react";

type StatusType = "idle" | "success" | "error";
type Step = "product" | "serial";

interface ScannedEntry {
  id?: string;
  code: string;
  name: string;
  serial: string;
  loadNumber: string;
  timestamp: number;
}

export default function Index() {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const serialRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("product");
  const [barcode, setBarcode] = useState("");
  const [serial, setSerial] = useState("");
  const [lockedProduct, setLockedProduct] = useState<{ code: string; name: string } | null>(null);
  const [loadNumber, setOrderNumber] = useState("");

  const [statusType, setStatusType] = useState<StatusType>("idle");
  const [statusMsg, setStatusMsg] = useState("AGUARDANDO BIP DO PRODUTO...");
  const [flashKey, setFlashKey] = useState(0);
  const [scannedEntries, setScannedEntries] = useState<ScannedEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { products, loading: loadingProducts, lookupProduct, refresh } = useProductDatabase();
  const { session, signOut } = useAuth();

  const orderFocusedRef = useRef(false);

  // Auto-focus no campo ativo — pausa quando o campo de carga OU um modal estiver em uso
  useEffect(() => {
    const focusActive = () => {
      if (orderFocusedRef.current || dialogOpen) return;
      if (step === "product") barcodeRef.current?.focus();
      else serialRef.current?.focus();
    };
    const interval = setInterval(focusActive, 15000);
    focusActive();
    return () => clearInterval(interval);
  }, [step, dialogOpen]);

  // Recarrega os itens já bipados para a carga digitada — restaura estado após refresh
  useEffect(() => {
    const num = loadNumber.trim();
    if (!num) {
      setScannedEntries([]);
      return;
    }
    const loadOrderScans = async () => {
      const { data, error } = await supabase
        .from("scans")
        .select("id, product_code, product_name, serial, load_number, created_at")
        .eq("load_number", num)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setScannedEntries(
          data.map((d) => ({
            id: d.id,
            code: d.product_code,
            name: d.product_name,
            serial: d.serial,
            loadNumber: d.load_number,
            timestamp: new Date(d.created_at).getTime(),
          }))
        );
      }
    };
    loadOrderScans();
  }, [loadNumber]);

  const triggerStatus = (type: StatusType, msg: string) => {
    setStatusType(type);
    setStatusMsg(msg);
    setFlashKey((k) => k + 1);
  };

  const handleBarcodeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const code = barcode.trim();
        setBarcode("");
        if (!code) return;
        const name = lookupProduct(code);
        if (name) {
          setLockedProduct({ code, name });
          setStep("serial");
          triggerStatus("idle", "BIPE O NÚMERO DE SÉRIE:");
        } else {
          triggerStatus("error", `ERRO: CÓDIGO ${code} NÃO CADASTRADO`);
        }
      }
    },
    [barcode, lookupProduct]
  );

  // Bip da série → grava direto no Supabase JÁ vinculado à carga atual
  const handleSerialKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      const sn = serial.trim();
      setSerial("");
      if (!sn || !lockedProduct) return;

      const currentLoad = loadNumber.trim();
      if (!currentLoad) {
        triggerStatus("error", "ERRO: INFORME O Nº DA CARGA ANTES DE BIPAR");
        return;
      }

      const isDuplicate = scannedEntries.some((entry) => entry.serial === sn);
      if (isDuplicate) {
        triggerStatus("error", `ERRO: SÉRIE ${sn} JÁ CONFERIDA!`);
        return;
      }

      const { data, error } = await supabase
        .from("scans")
        .insert({
          load_number: currentLoad,
          product_code: lockedProduct.code,
          product_name: lockedProduct.name,
          serial: sn,
          scanned_by: session?.user.id,
        })
        .select()
        .single();

      if (error) {
        triggerStatus("error", `ERRO AO SALVAR (${error.code}): ${error.message}`);
        return;
      }

      setScannedEntries((prev) => [
        {
          id: data.id,
          code: lockedProduct.code,
          name: lockedProduct.name,
          serial: sn,
          loadNumber: currentLoad,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      triggerStatus("success", `OK: S/N ${sn}`);
    },
    [serial, lockedProduct, scannedEntries, loadNumber, session]
  );

  const handleFinalizar = () => {
    setLockedProduct(null);
    setSerial("");
    setStep("product");
    setStatusType("idle");
    setStatusMsg("AGUARDANDO BIP DO PRODUTO...");
  };

  const handleDeleteEntry = async (entry: ScannedEntry) => {
    if (entry.id) {
      await supabase.from("scans").delete().eq("id", entry.id);
    }
    setScannedEntries((prev) => prev.filter((e) => e.id !== entry.id));
  };

  const handleClearConferencia = async () => {
    const num = loadNumber.trim();
    if (num) {
      await supabase.from("scans").delete().eq("load_number", num);
    }
    setScannedEntries([]);
    setLockedProduct(null);
    setSerial("");
    setStep("product");
    setStatusType("idle");
    setStatusMsg("AGUARDANDO BIP DO PRODUTO...");
  };

  const handleExportExcel = () => {
    if (scannedEntries.length === 0) return;

    const rows = scannedEntries.map((entry) => ({
      "Nº Carga": entry.loadNumber,
      Código: entry.code,
      Produto: entry.name,
      "Nº Série": entry.serial,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 18 }, { wch: 20 }, { wch: 40 }, { wch: 25 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Conferência");

    const safeLoad = loadNumber.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileName = safeLoad
      ? `conferencia_carga_${safeLoad}.xlsx`
      : `conferencia_${new Date().toISOString().slice(0, 10)}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  const statusBg =
    statusType === "success"
      ? "bg-[hsl(var(--status-success))]"
      : statusType === "error"
      ? "bg-[hsl(var(--status-error))]"
      : "bg-[hsl(var(--status-idle))]";

  const totalProducts = Object.keys(products).length;

  const currentProductSerials = lockedProduct
    ? scannedEntries.filter((e) => e.code === lockedProduct.code)
    : [];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <ScanBarcode className="w-5 h-5" />
          <span className="font-bold text-base tracking-wide">CONFERÊNCIA</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs opacity-80 hidden sm:inline">{session?.user.email}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => signOut()}
          >
            <LogOut className="w-3 h-3" /> Sair
          </Button>
        </div>
      </div>

      <Tabs defaultValue="conferencia" className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="rounded-none border-b border-border bg-secondary shrink-0 h-10 justify-start px-2 gap-1">
          <TabsTrigger value="conferencia" className="text-xs font-semibold data-[state=active]:bg-card">
            CONFERÊNCIA
          </TabsTrigger>
          <TabsTrigger value="produtos" className="text-xs font-semibold data-[state=active]:bg-card">
            PRODUTOS ({totalProducts})
          </TabsTrigger>
        </TabsList>

        {/* ---- ABA CONFERÊNCIA ---- */}
        <TabsContent value="conferencia" className="flex flex-col flex-1 overflow-hidden m-0 p-3 gap-3">
          <div className="bg-card border border-border rounded-md px-3 py-2 shrink-0 flex items-center gap-3">
            <label className="text-xs font-bold text-muted-foreground tracking-widest whitespace-nowrap shrink-0">
              Nº CARGA:
            </label>
            <input
              type="text"
              value={loadNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              onFocus={() => {
                orderFocusedRef.current = true;
              }}
              onBlur={() => {
                orderFocusedRef.current = false;
              }}
              placeholder="Digite ou bipe a carga"
              autoComplete="off"
              className="flex-1 text-base font-bold border-2 border-input rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground placeholder:font-normal placeholder:text-sm"
            />
          </div>

          {step === "product" ? (
            <>
              <div className="bg-card border border-border rounded-md p-3 shrink-0">
                <label className="text-xs font-bold text-primary tracking-widest block mb-1">
                  BIPE O PRODUTO:
                </label>
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={!loadNumber.trim()}
                  className="w-full text-xl font-bold border-2 border-input rounded px-3 py-2 bg-background text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
                />
                {!loadNumber.trim() && (
                  <p className="text-xs text-muted-foreground mt-1">Informe o nº da carga para liberar a bipagem.</p>
                )}
              </div>

              <div
                key={flashKey}
                className={`status-flash ${statusBg} text-white font-bold text-center text-base rounded-md py-3 px-3 shrink-0 shadow`}
              >
                {statusMsg}
              </div>

              <div className="bg-card border border-border rounded-md flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
                  <span className="text-xs font-bold text-muted-foreground tracking-widest">
                    HISTÓRICO ({scannedEntries.length})
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      disabled={scannedEntries.length === 0}
                      onClick={handleExportExcel}
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      Excel
                    </Button>
                    <AlertDialog onOpenChange={setDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={scannedEntries.length === 0}
                        >
                          <Trash2 className="w-3 h-3" />
                          Limpar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Zerar conferência desta carga?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Todos os itens bipados para a carga {loadNumber || "atual"} serão apagados do banco de
                            dados. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleClearConferencia}>Limpar Tudo</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="overflow-auto flex-1">
                  {scannedEntries.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
                      Nenhum item conferido ainda
                    </div>
                  ) : (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted sticky top-0">
                          <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground border-b border-border">
                            PRODUTO
                          </th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground border-b border-border">
                            SÉRIE
                          </th>
                          <th className="w-8 border-b border-border"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {scannedEntries.map((entry) => (
                          <tr key={entry.id ?? entry.serial} className="border-b border-border last:border-0 hover:bg-muted/40">
                            <td className="px-3 py-2 text-xs">
                              <div className="font-medium">{entry.name}</div>
                              <div className="text-muted-foreground font-mono">{entry.code}</div>
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-primary">{entry.serial}</td>
                            <td className="px-1">
                              <button
                                onClick={() => handleDeleteEntry(entry)}
                                className="text-muted-foreground hover:text-destructive p-1"
                                aria-label="Remover item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-primary text-primary-foreground rounded-md px-4 py-3 shrink-0 flex items-center gap-3 shadow">
                <Lock className="w-5 h-5 shrink-0 opacity-80" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold opacity-70 tracking-widest">PRODUTO SELECIONADO</div>
                  <div className="font-bold text-base leading-tight truncate">{lockedProduct?.name}</div>
                  <div className="font-mono text-xs opacity-70">{lockedProduct?.code}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-black">{currentProductSerials.length}</div>
                  <div className="text-xs opacity-70">série(s)</div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-md p-3 shrink-0">
                <label className="text-xs font-bold text-primary tracking-widest block mb-1">
                  BIPE O NÚMERO DE SÉRIE:
                </label>
                <input
                  ref={serialRef}
                  type="text"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  onKeyDown={handleSerialKeyDown}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full text-xl font-bold border-2 border-input rounded px-3 py-2 bg-background text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div
                key={flashKey}
                className={`status-flash ${statusBg} text-white font-bold text-center text-base rounded-md py-3 px-3 shrink-0 shadow`}
              >
                {statusMsg}
              </div>

              <Button
                onClick={handleFinalizar}
                className="w-full h-12 text-base font-bold gap-2 shrink-0 bg-[hsl(var(--status-success))] hover:bg-[hsl(var(--status-success-light))] text-white"
              >
                <CheckCircle className="w-5 h-5" />
                FINALIZAR — BIPAR PRÓXIMO PRODUTO
              </Button>

              <div className="bg-card border border-border rounded-md flex flex-col flex-1 overflow-hidden">
                <div className="px-3 py-2 border-b border-border shrink-0">
                  <span className="text-xs font-bold text-muted-foreground tracking-widest">
                    SÉRIES CONFERIDAS ({currentProductSerials.length})
                  </span>
                </div>
                <div className="overflow-auto flex-1">
                  {currentProductSerials.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-6">
                      Bipe o número de série do produto
                    </div>
                  ) : (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted sticky top-0">
                          <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground border-b border-border">
                            #
                          </th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground border-b border-border">
                            NÚMERO DE SÉRIE
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentProductSerials.map((entry, i) => (
                          <tr key={entry.id ?? i} className="border-b border-border last:border-0 hover:bg-muted/40">
                            <td className="px-3 py-2 text-muted-foreground text-xs font-bold">
                              {currentProductSerials.length - i}
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-primary">{entry.serial}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ---- ABA PRODUTOS ---- */}
        <TabsContent value="produtos" className="flex flex-col flex-1 overflow-hidden m-0 p-3 gap-3">
          <div className="bg-card border border-border rounded-md p-3 shrink-0">
            <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2">
              CATÁLOGO (BANCO DE DADOS NA NUVEM)
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Os produtos são cadastrados diretamente no Supabase (tabela{" "}
              <code className="bg-muted px-1 rounded">products</code>), pelo painel do Supabase ou por outro sistema
              que grave na mesma tabela.
            </p>
            <Button variant="default" size="sm" className="gap-2" onClick={refresh} disabled={loadingProducts}>
              <RefreshCw className={`w-4 h-4 ${loadingProducts ? "animate-spin" : ""}`} />
              Sincronizar catálogo
            </Button>
          </div>

          <div className="bg-card border border-border rounded-md flex flex-col flex-1 overflow-hidden">
            <div className="px-3 py-2 border-b border-border shrink-0">
              <span className="text-xs font-bold text-muted-foreground tracking-widest">
                PRODUTOS CADASTRADOS ({totalProducts})
              </span>
            </div>
            <div className="overflow-auto flex-1">
              {totalProducts === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm py-8 gap-2">
                  <PackageSearch className="w-8 h-8 opacity-30" />
                  <span>Nenhum produto cadastrado</span>
                  <span className="text-xs">Cadastre produtos na tabela do Supabase</span>
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted sticky top-0">
                      <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground border-b border-border">
                        CÓDIGO
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground border-b border-border">
                        PRODUTO
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(products).map(([code, name]) => (
                      <tr key={code} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{code}</td>
                        <td className="px-3 py-2 font-medium">{name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
