import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, FileSpreadsheet, Building2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Check, CheckSquare, Square } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Lista de estados brasileiros
const ESTADOS_BR = [
  { sigla: "", nome: "Todos os estados" },
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

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
  hasMore: boolean;
}

const PAGE_SIZE = 50;

// Funcao para verificar se telefone eh valido (nao eh apenas "55()" ou similar)
const isValidPhone = (phone: string | null): boolean => {
  if (!phone) return false;
  // Remove tudo que nao for numero
  const digits = phone.replace(/\D/g, "");
  // Telefone valido deve ter pelo menos 8 digitos alem do codigo do pais (55)
  return digits.length >= 10;
};

const formatPhone = (phone: string | null): string => {
  if (!isValidPhone(phone)) return "-";
  return phone || "-";
};

export default function SearchCompanies() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [activeEstado, setActiveEstado] = useState("");
  const [includeSecondary, setIncludeSecondary] = useState(false);
  const [activeIncludeSecondary, setActiveIncludeSecondary] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    Object.fromEntries(COLUMNS.map(col => [col.key, col.width]))
  );
  const [exportedIds, setExportedIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
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
    queryKey: ["/api/empresas/search", activeSearch, activeEstado, activeIncludeSecondary, currentPage],
    queryFn: async () => {
      if (!activeSearch) return { data: [], total: 0, hasMore: false };

      let url = `/api/empresas/search?cnae=${encodeURIComponent(activeSearch)}&page=${currentPage}&pageSize=${PAGE_SIZE}`;
      if (activeEstado) {
        url += `&estado=${encodeURIComponent(activeEstado)}`;
      }
      if (activeIncludeSecondary) {
        url += `&includeSecondary=true`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Erro ao buscar empresas");
      }

      return response.json();
    },
    enabled: !!activeSearch,
  });

  // Busca o total de forma assíncrona (separado)
  const { data: countResult, isLoading: isCountLoading } = useQuery<{ count: number }>({
    queryKey: ["/api/empresas/count", activeSearch, activeEstado, activeIncludeSecondary],
    queryFn: async () => {
      if (!activeSearch) return { count: 0 };

      let url = `/api/empresas/count?cnae=${encodeURIComponent(activeSearch)}`;
      if (activeEstado) {
        url += `&estado=${encodeURIComponent(activeEstado)}`;
      }
      if (activeIncludeSecondary) {
        url += `&includeSecondary=true`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Erro ao contar empresas");
      }

      return response.json();
    },
    enabled: !!activeSearch,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const results = result?.data || [];
  const totalRecords = countResult?.count || 0;
  const hasMore = result?.hasMore || false;
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
    setActiveEstado(estadoFilter);
    setActiveIncludeSecondary(includeSecondary);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, page));
  };

  // Registros nao exportados da pagina atual
  const notExportedResults = results.filter(e => !exportedIds.has(e.id));

  // Toggle selecao de um registro
  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Selecionar todos nao exportados da pagina atual
  const selectAllNotExported = () => {
    const notExportedIds = notExportedResults.map(e => e.id);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      notExportedIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  // Desmarcar todos da pagina atual
  const deselectAll = () => {
    const pageIds = results.map(e => e.id);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      pageIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  };

  // Verifica se todos nao exportados estao selecionados
  const allNotExportedSelected = notExportedResults.length > 0 &&
    notExportedResults.every(e => selectedIds.has(e.id));

  const exportToExcel = (onlySelected: boolean = false) => {
    let dataToExport = results;

    if (onlySelected) {
      dataToExport = results.filter(e => selectedIds.has(e.id));
      if (dataToExport.length === 0) {
        toast({
          title: "Nenhum registro selecionado",
          description: "Selecione os registros que deseja exportar.",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (results.length === 0) {
        toast({
          title: "Nada para exportar",
          description: "Realize uma busca primeiro.",
          variant: "destructive",
        });
        return;
      }
    }

    const exportData = dataToExport.map(empresa => ({
      CNPJ: empresa.cnpj || "",
      "Razao Social": empresa.razaoSocial || "",
      "Nome Fantasia": empresa.nomeFantasia || "",
      "Telefone 1": isValidPhone(empresa.telefone1) ? empresa.telefone1 : "",
      "Telefone 2": isValidPhone(empresa.telefone2) ? empresa.telefone2 : "",
      "Email": empresa.email || "",
      "CNAE Principal": empresa.cnaePrincipal || "",
      "Descricao CNAE": empresa.descricaoCnaePrincipal || "",
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
    XLSX.writeFile(workbook, `empresas_cnae_${new Date().toISOString().slice(0,10)}.xlsx`);

    // Marcar os IDs exportados
    const exportedIdsList = dataToExport.map(e => e.id);
    setExportedIds(prev => {
      const newSet = new Set(prev);
      exportedIdsList.forEach(id => newSet.add(id));
      return newSet;
    });

    // Limpar selecao dos exportados
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      exportedIdsList.forEach(id => newSet.delete(id));
      return newSet;
    });

    toast({
      title: "Exportacao concluida",
      description: `${dataToExport.length} registros exportados com sucesso.`,
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
            <CardDescription>Digite o codigo CNAE, multiplos codigos separados por virgula, ou a descricao da atividade</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    data-testid="input-cnae-search"
                    placeholder="Ex: 6821801 ou 4924800,8512100 ou restaurante..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select
                  value={estadoFilter || "all"}
                  onValueChange={(value) => setEstadoFilter(value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map((estado) => (
                      <SelectItem key={estado.sigla || "all"} value={estado.sigla || "all"}>
                        {estado.sigla ? `${estado.sigla} - ${estado.nome}` : estado.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <div className="flex items-center gap-2 mt-3">
              <Checkbox
                id="includeSecondary"
                checked={includeSecondary}
                onCheckedChange={(checked) => setIncludeSecondary(checked === true)}
              />
              <Label htmlFor="includeSecondary" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                Buscar CNAE secundario (inclui empresas onde o codigo buscado aparece como atividade secundaria)
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                Resultados {results.length > 0 && <span className="text-sm font-normal text-slate-500 ml-2">({isCountLoading ? 'Calculando...' : totalRecords.toLocaleString('pt-BR')} empresas encontradas)</span>}
              </h2>
              {results.length > 0 && (
                <div className="flex gap-2 mt-1 text-sm text-slate-500">
                  {exportedIds.size > 0 && (
                    <span className="text-amber-600">{results.filter(e => exportedIds.has(e.id)).length} ja exportados nesta pagina</span>
                  )}
                  {selectedIds.size > 0 && (
                    <span className="text-blue-600">| {results.filter(e => selectedIds.has(e.id)).length} selecionados</span>
                  )}
                </div>
              )}
            </div>
            {results.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={allNotExportedSelected ? deselectAll : selectAllNotExported}
                  className="gap-2"
                  disabled={notExportedResults.length === 0}
                >
                  {allNotExportedSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  {allNotExportedSelected ? "Desmarcar todos" : "Selecionar nao exportados"}
                </Button>
                <Button
                  data-testid="button-export-selected"
                  variant="secondary"
                  onClick={() => exportToExcel(true)}
                  disabled={selectedIds.size === 0}
                  className="gap-2 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Selecionados ({results.filter(e => selectedIds.has(e.id)).length})
                </Button>
                <Button
                  data-testid="button-export-excel"
                  variant="secondary"
                  onClick={() => exportToExcel(false)}
                  className="gap-2 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Todos
                </Button>
              </div>
            )}
          </div>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
             {results.length > 0 ? (
               <div className="overflow-auto h-[calc(100vh-300px)] min-h-[600px]">
                 <table className="w-full border-collapse" style={{ minWidth: Object.values(columnWidths).reduce((a, b) => a + b, 0) }}>
                   <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                     <tr>
                       <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-3 border-b bg-slate-50 dark:bg-slate-900/50 w-12">
                         <button
                           onClick={allNotExportedSelected ? deselectAll : selectAllNotExported}
                           className="p-1 hover:bg-slate-200 rounded"
                           title={allNotExportedSelected ? "Desmarcar todos" : "Selecionar nao exportados"}
                         >
                           {allNotExportedSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                         </button>
                       </th>
                       <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-3 border-b bg-slate-50 dark:bg-slate-900/50 w-16">
                         Status
                       </th>
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
                     {results.map((empresa) => {
                       const isExported = exportedIds.has(empresa.id);
                       const isSelected = selectedIds.has(empresa.id);
                       return (
                         <tr
                           key={empresa.id}
                           className={`border-b transition-colors ${
                             isExported
                               ? "bg-amber-50 dark:bg-amber-900/20 opacity-60"
                               : isSelected
                               ? "bg-blue-50 dark:bg-blue-900/20"
                               : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                           }`}
                         >
                           <td className="px-2 py-2 text-center w-12">
                             <button
                               onClick={() => toggleSelection(empresa.id)}
                               className={`p-1 rounded ${isExported ? "cursor-not-allowed opacity-50" : "hover:bg-slate-200"}`}
                               disabled={isExported}
                               title={isExported ? "Ja exportado" : isSelected ? "Desmarcar" : "Selecionar"}
                             >
                               {isSelected ? (
                                 <CheckSquare className="h-4 w-4 text-blue-600" />
                               ) : (
                                 <Square className="h-4 w-4 text-slate-400" />
                               )}
                             </button>
                           </td>
                           <td className="px-2 py-2 text-center w-16">
                             {isExported ? (
                               <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">
                                 <Check className="h-3 w-3 mr-1" />
                                 Exp
                               </Badge>
                             ) : (
                               <span className="text-slate-300 text-xs">-</span>
                             )}
                           </td>
                           <td className="px-4 py-2 font-mono text-xs" style={{ width: columnWidths.cnpj }}>{empresa.cnpj || "-"}</td>
                           <td className="px-4 py-2 font-medium text-blue-600 dark:text-blue-400" style={{ width: columnWidths.razaoSocial }}>{empresa.razaoSocial || "-"}</td>
                           <td className="px-4 py-2" style={{ width: columnWidths.nomeFantasia }}>{empresa.nomeFantasia || "-"}</td>
                           <td className="px-4 py-2 text-sm" style={{ width: columnWidths.telefone1 }}>{formatPhone(empresa.telefone1)}</td>
                           <td className="px-4 py-2 text-sm" style={{ width: columnWidths.telefone2 }}>{formatPhone(empresa.telefone2)}</td>
                           <td className="px-4 py-2 text-sm text-slate-500" style={{ width: columnWidths.email }}>{empresa.email || "-"}</td>
                           <td className="px-4 py-2 font-mono text-xs text-slate-500" style={{ width: columnWidths.cnaePrincipal }}>{empresa.cnaePrincipal || "-"}</td>
                           <td className="px-4 py-2" style={{ width: columnWidths.descricaoCnaePrincipal }} title={empresa.descricaoCnaePrincipal || ""}>{empresa.descricaoCnaePrincipal || "-"}</td>
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
                       );
                     })}
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
          {results.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Mostrando {((currentPage - 1) * PAGE_SIZE) + 1} a {((currentPage - 1) * PAGE_SIZE) + results.length}
                {isCountLoading ? ' de ...' : ` de ${totalRecords.toLocaleString('pt-BR')}`} registros
                {totalPages > 0 && !isCountLoading && ` (${totalPages} páginas)`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium">Pagina</span>
                  <span className="text-sm font-bold px-2">{currentPage}</span>
                  {!isCountLoading && totalPages > 0 && (
                    <span className="text-sm text-slate-500">de {totalPages}</span>
                  )}
                  {isCountLoading && <span className="text-sm text-slate-400">de ...</span>}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={!hasMore || isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {totalPages > 0 && !isCountLoading && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage >= totalPages || isLoading}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
