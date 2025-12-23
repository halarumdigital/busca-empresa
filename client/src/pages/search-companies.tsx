import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, FileSpreadsheet, Building2, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Company {
  id: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  telefone1: string | null;
  telefone2: string | null;
  email: string | null;
  cnaePrincipal: string;
  descCnaePrincipal: string | null;
  cnaeSecundaria: string | null;
  inicioAtividades: string | null;
  porte: string | null;
  mei: string | null;
  simples: string | null;
  capitalSocial: string | null;
  situacaoCadastral: string | null;
  dataSituacao: string | null;
  motivoSituacao: string | null;
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

export default function SearchCompanies() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const { toast } = useToast();

  const { data: results = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies/search", activeSearch],
    queryFn: async () => {
      if (!activeSearch) return [];
      
      const response = await fetch(`/api/companies/search?cnae=${encodeURIComponent(activeSearch)}`);
      
      if (!response.ok) {
        throw new Error("Erro ao buscar empresas");
      }
      
      return response.json();
    },
    enabled: !!activeSearch,
  });

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
    
    setActiveSearch(searchTerm);
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

    const exportData = results.map(company => ({
      CNPJ: company.cnpj,
      "Razão Social": company.razaoSocial,
      "Nome Fantasia": company.nomeFantasia || "",
      "Telefone 1": company.telefone1 || "",
      "Telefone 2": company.telefone2 || "",
      "Email": company.email || "",
      "CNAE Principal": company.cnaePrincipal,
      "Descrição CNAE": company.descCnaePrincipal || "",
      "CNAE Secundária": company.cnaeSecundaria || "",
      "Início Atividades": company.inicioAtividades || "",
      "Porte": company.porte || "",
      "MEI": company.mei || "",
      "Simples": company.simples || "",
      "Capital Social": company.capitalSocial || "",
      "Situação Cadastral": company.situacaoCadastral || "",
      "Data Situação": company.dataSituacao || "",
      "Motivo Situação": company.motivoSituacao || "",
      "Matriz/Filial": company.matrizFilial || "",
      "Natureza Jurídica": company.naturezaJuridica || "",
      "Endereço": company.endereco || "",
      "Complemento": company.complemento || "",
      "CEP": company.cep || "",
      "Bairro": company.bairro || "",
      "Cidade": company.cidade || "",
      "Estado": company.estado || "",
      "Nome Sócio": company.nomeSocio || "",
      "Qualificação Sócio": company.qualificacaoSocio || "",
      "Faixa Etária": company.faixaEtaria || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");
    XLSX.writeFile(workbook, "empresas_cnae.xlsx");

    toast({
      title: "Exportação concluída",
      description: "O arquivo Excel foi baixado com sucesso.",
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
              Consulte empresas por CNAE e exporte os dados para análise.
            </p>
          </div>
          <Button variant="outline" className="hidden md:flex gap-2">
            <Filter className="h-4 w-4" /> Filtros Avançados
          </Button>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle>Filtrar por Atividade Econômica</CardTitle>
            <CardDescription>Digite o código ou descrição do CNAE Principal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    data-testid="input-cnae-search"
                    placeholder="Ex: 6200-0/00 ou Consultoria..." 
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
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
              Resultados {results.length > 0 && <span className="text-sm font-normal text-slate-500 ml-2">({results.length} registros)</span>}
            </h2>
            {results.length > 0 && (
              <Button 
                data-testid="button-export-excel"
                variant="secondary" 
                onClick={exportToExcel} 
                className="gap-2 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Excel
              </Button>
            )}
          </div>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
             {results.length > 0 ? (
               <ScrollArea className="w-full whitespace-nowrap rounded-md h-[600px]">
                 <div className="w-full">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 shadow-sm">
                      <TableRow>
                        <TableHead className="w-[180px] bg-slate-50 dark:bg-slate-900/50">CNPJ</TableHead>
                        <TableHead className="min-w-[200px] bg-slate-50 dark:bg-slate-900/50">Razão Social</TableHead>
                        <TableHead className="min-w-[200px] bg-slate-50 dark:bg-slate-900/50">Nome Fantasia</TableHead>
                        <TableHead className="min-w-[150px] bg-slate-50 dark:bg-slate-900/50">Telefone 1</TableHead>
                        <TableHead className="min-w-[150px] bg-slate-50 dark:bg-slate-900/50">Telefone 2</TableHead>
                        <TableHead className="min-w-[200px] bg-slate-50 dark:bg-slate-900/50">Email</TableHead>
                        <TableHead className="min-w-[120px] bg-slate-50 dark:bg-slate-900/50">CNAE Principal</TableHead>
                        <TableHead className="min-w-[300px] bg-slate-50 dark:bg-slate-900/50">Descrição CNAE</TableHead>
                        <TableHead className="min-w-[120px] bg-slate-50 dark:bg-slate-900/50">CNAE Sec.</TableHead>
                        <TableHead className="min-w-[150px] bg-slate-50 dark:bg-slate-900/50">Início Atividades</TableHead>
                        <TableHead className="min-w-[150px] bg-slate-50 dark:bg-slate-900/50">Porte</TableHead>
                        <TableHead className="bg-slate-50 dark:bg-slate-900/50">MEI</TableHead>
                        <TableHead className="bg-slate-50 dark:bg-slate-900/50">Simples</TableHead>
                        <TableHead className="min-w-[150px] bg-slate-50 dark:bg-slate-900/50">Capital Social</TableHead>
                        <TableHead className="min-w-[150px] bg-slate-50 dark:bg-slate-900/50">Situação</TableHead>
                        <TableHead className="min-w-[150px] bg-slate-50 dark:bg-slate-900/50">Data Situação</TableHead>
                        <TableHead className="min-w-[200px] bg-slate-50 dark:bg-slate-900/50">Motivo Situação</TableHead>
                        <TableHead className="bg-slate-50 dark:bg-slate-900/50">Matriz/Filial</TableHead>
                        <TableHead className="min-w-[300px] bg-slate-50 dark:bg-slate-900/50">Natureza Jurídica</TableHead>
                        <TableHead className="min-w-[300px] bg-slate-50 dark:bg-slate-900/50">Endereço</TableHead>
                        <TableHead className="min-w-[150px] bg-slate-50 dark:bg-slate-900/50">Complemento</TableHead>
                        <TableHead className="min-w-[120px] bg-slate-50 dark:bg-slate-900/50">CEP</TableHead>
                        <TableHead className="min-w-[150px] bg-slate-50 dark:bg-slate-900/50">Bairro</TableHead>
                        <TableHead className="min-w-[150px] bg-slate-50 dark:bg-slate-900/50">Cidade</TableHead>
                        <TableHead className="bg-slate-50 dark:bg-slate-900/50">UF</TableHead>
                        <TableHead className="min-w-[200px] bg-slate-50 dark:bg-slate-900/50">Nome Sócio</TableHead>
                        <TableHead className="min-w-[200px] bg-slate-50 dark:bg-slate-900/50">Qualificação</TableHead>
                        <TableHead className="min-w-[150px] bg-slate-50 dark:bg-slate-900/50">Faixa Etária</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((company) => (
                        <TableRow key={company.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50" data-testid={`row-company-${company.id}`}>
                          <TableCell className="font-medium font-mono text-xs">{company.cnpj}</TableCell>
                          <TableCell className="font-medium text-blue-600 dark:text-blue-400">{company.razaoSocial}</TableCell>
                          <TableCell>{company.nomeFantasia || "-"}</TableCell>
                          <TableCell className="text-sm">{company.telefone1 || "-"}</TableCell>
                          <TableCell className="text-sm">{company.telefone2 || "-"}</TableCell>
                          <TableCell className="text-sm text-slate-500">{company.email || "-"}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{company.cnaePrincipal}</TableCell>
                          <TableCell className="max-w-[300px] truncate" title={company.descCnaePrincipal || ""}>{company.descCnaePrincipal || "-"}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{company.cnaeSecundaria || "-"}</TableCell>
                          <TableCell>{company.inicioAtividades || "-"}</TableCell>
                          <TableCell>{company.porte || "-"}</TableCell>
                          <TableCell>{company.mei || "-"}</TableCell>
                          <TableCell>{company.simples || "-"}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{company.capitalSocial || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={company.situacaoCadastral === 'Ativa' ? 'default' : 'destructive'} className={company.situacaoCadastral === 'Ativa' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                              {company.situacaoCadastral || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>{company.dataSituacao || "-"}</TableCell>
                          <TableCell>{company.motivoSituacao || "-"}</TableCell>
                          <TableCell>{company.matrizFilial || "-"}</TableCell>
                          <TableCell className="max-w-[300px] truncate" title={company.naturezaJuridica || ""}>{company.naturezaJuridica || "-"}</TableCell>
                          <TableCell className="max-w-[300px] truncate" title={company.endereco || ""}>{company.endereco || "-"}</TableCell>
                          <TableCell>{company.complemento || "-"}</TableCell>
                          <TableCell>{company.cep || "-"}</TableCell>
                          <TableCell>{company.bairro || "-"}</TableCell>
                          <TableCell>{company.cidade || "-"}</TableCell>
                          <TableCell>{company.estado || "-"}</TableCell>
                          <TableCell>{company.nomeSocio || "-"}</TableCell>
                          <TableCell>{company.qualificacaoSocio || "-"}</TableCell>
                          <TableCell>{company.faixaEtaria || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                 </div>
                 <ScrollBar orientation="horizontal" />
                 <ScrollBar orientation="vertical" />
               </ScrollArea>
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
        </div>
      </div>
    </div>
  );
}
