import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, FileSpreadsheet, Building2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// Colunas da tabela
const COLUMNS = [
  { key: "cnpj", label: "CNPJ", width: 180 },
  { key: "razaoSocial", label: "Razao Social", width: 250 },
  { key: "nomeFantasia", label: "Nome Fantasia", width: 200 },
  { key: "telefone1", label: "Telefone 1", width: 150 },
  { key: "telefone2", label: "Telefone 2", width: 150 },
  { key: "email", label: "Email", width: 250 },
  { key: "cnaePrincipal", label: "CNAE Principal", width: 130 },
  { key: "descricaoCnaePrincipal", label: "Descricao CNAE", width: 350 },
  { key: "cnaeSecundaria", label: "CNAE Sec.", width: 200 },
  { key: "inicioAtividades", label: "Inicio Atividades", width: 150 },
  { key: "porte", label: "Porte", width: 150 },
  { key: "mei", label: "MEI", width: 80 },
  { key: "simples", label: "Simples", width: 80 },
  { key: "capitalSocial", label: "Capital Social", width: 150 },
  { key: "situacaoCadastral", label: "Situacao", width: 120 },
  { key: "dataSituacaoCadastral", label: "Data Situacao", width: 150 },
  { key: "motivoSituacaoCadastral", label: "Motivo Situacao", width: 200 },
  { key: "matrizFilial", label: "Matriz/Filial", width: 100 },
  { key: "naturezaJuridica", label: "Natureza Juridica", width: 300 },
  { key: "endereco", label: "Endereco", width: 300 },
  { key: "complemento", label: "Complemento", width: 150 },
  { key: "cep", label: "CEP", width: 120 },
  { key: "bairro", label: "Bairro", width: 150 },
  { key: "cidade", label: "Cidade", width: 150 },
  { key: "estado", label: "UF", width: 60 },
  { key: "nomeSocio", label: "Nome Socio", width: 200 },
  { key: "qualificacaoSocio", label: "Qualificacao", width: 200 },
  { key: "faixaEtaria", label: "Faixa Etaria", width: 150 },
];

interface Empresa {
  id: number;
  cnpj: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  telefone1: string | null;
  telefone2: string | null;
  email: string | null;
  cnaePrincipal: string | null;
  descricaoCnaePrincipal: string | null;
  cnaeSecundaria: string | null;
  inicioAtividades: string | null;
  porte: string | null;
  mei: string | null;
  simples: string | null;
  capitalSocial: string | null;
  situacaoCadastral: string | null;
  dataSituacaoCadastral: string | null;
  motivoSituacaoCadastral: string | null;
  matrizFilial: string | null;
  naturezaJuridica: string | null;
  endereco: string | null;
  complemento: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  nomeSocio: string | null;
  qualificacaoSocio: string | null;
  faixaEtaria: string | null;
}

interface SearchResult {
  data: Empresa[];
  total: number;
}

const PAGE_SIZE = 50;

export default function SearchCompanies() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    Object.fromEntries(COLUMNS.map(col => [col.key, col.width]))
  );
  const { toast } = useToast();
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const handleMouseDown = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = {
      key,
      startX: e.clientX,
      startWidth: columnWidths[key],
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const diff = e.clientX - resizingRef.current.startX;
      const newWidth = Math.max(50, resizingRef.current.startWidth + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizingRef.current!.key]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [columnWidths]);

  const { data: result, isLoading } = useQuery<SearchResult>({
    queryKey: ["/api/empresas/search", activeSearch, currentPage],
    queryFn: async () => {
      if (!activeSearch) return { data: [], total: 0 };

      const response = await fetch(
        `/api/empresas/search?cnae=${encodeURIComponent(activeSearch)}&page=${currentPage}&pageSize=${PAGE_SIZE}`
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar empresas");
      }

      return response.json();
    },
    enabled: !!activeSearch,
  });

  const results = result?.data || [];
  const totalRecords = result?.total || 0;
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchTerm.trim()) {
      toast({
        title: "Campo vazio",
        description: "Digite um CNAE para buscar.",
        variant: "destructive",
      });
      return;
    }

    setCurrentPage(1);
    setActiveSearch(searchTerm);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const exportToExcel = () => {
    if (results.length === 0) {
      toast({
        title: "Nada para exportar",
        description: "Realize uma busca primeiro.",
        variant: "destructive",
      });
      return;
    }

    const exportData = results.map(empresa => ({
      CNPJ: empresa.cnpj || "",
      "Razao Social": empresa.razaoSocial || "",
      "Nome Fantasia": empresa.nomeFantasia || "",
      "Telefone 1": empresa.telefone1 || "",
      "Telefone 2": empresa.telefone2 || "",
      "Email": empresa.email || "",
      "CNAE Principal": empresa.cnaePrincipal || "",
      "Descricao CNAE": empresa.descricaoCnaePrincipal || "",
      "CNAE Secundaria": empresa.cnaeSecundaria || "",
      "Inicio Atividades": empresa.inicioAtividades || "",
      "Porte": empresa.porte || "",
      "MEI": empresa.mei || "",
      "Simples": empresa.simples || "",
      "Capital Social": empresa.capitalSocial || "",
      "Situacao Cadastral": empresa.situacaoCadastral || "",
      "Data Situacao": empresa.dataSituacaoCadastral || "",
      "Motivo Situacao": empresa.motivoSituacaoCadastral || "",
      "Matriz/Filial": empresa.matrizFilial || "",
      "Natureza Juridica": empresa.naturezaJuridica || "",
      "Endereco": empresa.endereco || "",
      "Complemento": empresa.complemento || "",
      "CEP": empresa.cep || "",
      "Bairro": empresa.bairro || "",
      "Cidade": empresa.cidade || "",
      "Estado": empresa.estado || "",
      "Nome Socio": empresa.nomeSocio || "",
      "Qualificacao Socio": empresa.qualificacaoSocio || "",
      "Faixa Etaria": empresa.faixaEtaria || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");
    XLSX.writeFile(workbook, `empresas_cnae_pagina_${currentPage}.xlsx`);

    toast({
      title: "Exportacao concluida",
      description: `Pagina ${currentPage} exportada com sucesso.`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 font-sans">
      <div className="max-w-[1800px] mx-auto space-y-8">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              Busca Empresarial
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Consulte empresas por CNAE e exporte os dados para analise.
            </p>
          </div>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle>Filtrar por Atividade Economica</CardTitle>
            <CardDescription>Digite o codigo ou descricao do CNAE Principal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    data-testid="input-cnae-search"
                    placeholder="Ex: 6821801 ou Imobiliaria..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Button
                data-testid="button-search"
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                disabled={isLoading}
              >
                {isLoading ? "Buscando..." : "Buscar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
              Resultados {totalRecords > 0 && <span className="text-sm font-normal text-slate-500 ml-2">({totalRecords} registros)</span>}
            </h2>
            {results.length > 0 && (
              <Button
                data-testid="button-export-excel"
                variant="secondary"
                onClick={exportToExcel}
                className="gap-2 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Pagina
              </Button>
            )}
          </div>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
             {results.length > 0 ? (
               <div className="overflow-auto h-[600px]">
                 <table className="w-full border-collapse" style={{ minWidth: Object.values(columnWidths).reduce((a, b) => a + b, 0) }}>
                   <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                     <tr>
                       {COLUMNS.map((col) => (
                         <th
                           key={col.key}
                           className="relative text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 border-b bg-slate-50 dark:bg-slate-900/50 select-none"
                           style={{ width: columnWidths[col.key], minWidth: columnWidths[col.key] }}
                         >
                           <span className="pr-2">{col.label}</span>
                           <div
                             className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
                             onMouseDown={(e) => handleMouseDown(col.key, e)}
                             title="Arraste para redimensionar"
                           />
                         </th>
                       ))}
                     </tr>
                   </thead>
                   <tbody>
                     {results.map((empresa) => (
                       <tr key={empresa.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b">
                         <td className="px-4 py-2 font-mono text-xs" style={{ width: columnWidths.cnpj }}>{empresa.cnpj || "-"}</td>
                         <td className="px-4 py-2 font-medium text-blue-600 dark:text-blue-400" style={{ width: columnWidths.razaoSocial }}>{empresa.razaoSocial || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.nomeFantasia }}>{empresa.nomeFantasia || "-"}</td>
                         <td className="px-4 py-2 text-sm" style={{ width: columnWidths.telefone1 }}>{empresa.telefone1 || "-"}</td>
                         <td className="px-4 py-2 text-sm" style={{ width: columnWidths.telefone2 }}>{empresa.telefone2 || "-"}</td>
                         <td className="px-4 py-2 text-sm text-slate-500" style={{ width: columnWidths.email }}>{empresa.email || "-"}</td>
                         <td className="px-4 py-2 font-mono text-xs text-slate-500" style={{ width: columnWidths.cnaePrincipal }}>{empresa.cnaePrincipal || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.descricaoCnaePrincipal }} title={empresa.descricaoCnaePrincipal || ""}>{empresa.descricaoCnaePrincipal || "-"}</td>
                         <td className="px-4 py-2 font-mono text-xs text-slate-500 whitespace-pre-wrap" style={{ width: columnWidths.cnaeSecundaria }}>{empresa.cnaeSecundaria?.replace(/,\s*/g, '\n') || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.inicioAtividades }}>{empresa.inicioAtividades || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.porte }}>{empresa.porte || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.mei }}>{empresa.mei || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.simples }}>{empresa.simples || "-"}</td>
                         <td className="px-4 py-2 text-right font-mono text-xs" style={{ width: columnWidths.capitalSocial }}>{empresa.capitalSocial || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.situacaoCadastral }}>
                           <Badge variant={empresa.situacaoCadastral === 'Ativa' ? 'default' : 'destructive'} className={empresa.situacaoCadastral === 'Ativa' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                             {empresa.situacaoCadastral || "N/A"}
                           </Badge>
                         </td>
                         <td className="px-4 py-2" style={{ width: columnWidths.dataSituacaoCadastral }}>{empresa.dataSituacaoCadastral || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.motivoSituacaoCadastral }}>{empresa.motivoSituacaoCadastral || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.matrizFilial }}>{empresa.matrizFilial || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.naturezaJuridica }} title={empresa.naturezaJuridica || ""}>{empresa.naturezaJuridica || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.endereco }} title={empresa.endereco || ""}>{empresa.endereco || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.complemento }}>{empresa.complemento || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.cep }}>{empresa.cep || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.bairro }}>{empresa.bairro || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.cidade }}>{empresa.cidade || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.estado }}>{empresa.estado || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.nomeSocio }}>{empresa.nomeSocio || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.qualificacaoSocio }}>{empresa.qualificacaoSocio || "-"}</td>
                         <td className="px-4 py-2" style={{ width: columnWidths.faixaEtaria }}>{empresa.faixaEtaria || "-"}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             ) : (
               <div className="p-12 text-center text-slate-500">
                 {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                        <p>Buscando dados no banco...</p>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-12 w-12 text-slate-300 mb-2" />
                      <p className="text-lg font-medium">Nenhum resultado para exibir</p>
                      <p className="text-sm">Utilize o campo de busca acima para encontrar empresas pelo CNAE.</p>
                    </div>
                 )}
               </div>
             )}
          </Card>

          {/* Paginacao */}
          {totalRecords > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Mostrando {((currentPage - 1) * PAGE_SIZE) + 1} a {Math.min(currentPage * PAGE_SIZE, totalRecords)} de {totalRecords} registros
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1 || isLoading || totalPages <= 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading || totalPages <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium">Pagina</span>
                  <span className="text-sm font-bold px-2">{currentPage}</span>
                  <span className="text-sm text-slate-500">de {totalPages || 1}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || isLoading || totalPages <= 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage >= totalPages || isLoading || totalPages <= 1}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
