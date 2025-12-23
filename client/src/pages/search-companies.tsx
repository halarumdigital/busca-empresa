import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, Download, FileSpreadsheet, Building2, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Company {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  telefone1: string;
  telefone2: string;
  email: string;
  cnaePrincipal: string;
  descCnaePrincipal: string;
  cnaeSecundaria: string;
  inicioAtividades: string;
  porte: string;
  mei: string;
  simples: string;
  capitalSocial: string;
  situacaoCadastral: string;
  dataSituacao: string;
  motivoSituacao: string;
  matrizFilial: string;
  naturezaJuridica: string;
  endereco: string;
  complemento: string;
  cep: string;
  bairro: string;
  cidade: string;
  estado: string;
  nomeSocio: string;
  qualificacaoSocio: string;
  faixaEtaria: string;
}

const MOCK_DATA: Company[] = [
  {
    cnpj: "12.345.678/0001-90",
    razaoSocial: "TECH SOLUTIONS LTDA",
    nomeFantasia: "TechSol",
    telefone1: "(11) 98765-4321",
    telefone2: "(11) 3000-0000",
    email: "contato@techsol.com.br",
    cnaePrincipal: "6200-0/00",
    descCnaePrincipal: "Consultoria em tecnologia da informação",
    cnaeSecundaria: "6311-9/00",
    inicioAtividades: "01/05/2020",
    porte: "Pequeno Porte",
    mei: "Não",
    simples: "Sim",
    capitalSocial: "R$ 100.000,00",
    situacaoCadastral: "Ativa",
    dataSituacao: "01/05/2020",
    motivoSituacao: "",
    matrizFilial: "Matriz",
    naturezaJuridica: "206-2 - Sociedade Empresária Limitada",
    endereco: "Av. Paulista, 1000",
    complemento: "Conj 101",
    cep: "01310-100",
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP",
    nomeSocio: "João da Silva",
    qualificacaoSocio: "Sócio-Administrador",
    faixaEtaria: "31-40 anos",
  },
  {
    cnpj: "98.765.432/0001-10",
    razaoSocial: "PADARIA PÃO QUENTE EIRELI",
    nomeFantasia: "Padaria do Zé",
    telefone1: "(21) 99999-8888",
    telefone2: "",
    email: "padariaze@gmail.com",
    cnaePrincipal: "4721-1/02",
    descCnaePrincipal: "Padaria e confeitaria com predominância de revenda",
    cnaeSecundaria: "5611-2/03",
    inicioAtividades: "15/03/2018",
    porte: "Microempresa",
    mei: "Não",
    simples: "Sim",
    capitalSocial: "R$ 50.000,00",
    situacaoCadastral: "Ativa",
    dataSituacao: "15/03/2018",
    motivoSituacao: "",
    matrizFilial: "Matriz",
    naturezaJuridica: "230-5 - Empresa Individual de Responsabilidade Limitada",
    endereco: "Rua das Flores, 50",
    complemento: "",
    cep: "20000-000",
    bairro: "Centro",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    nomeSocio: "José Santos",
    qualificacaoSocio: "Titular",
    faixaEtaria: "51-60 anos",
  },
  {
    cnpj: "45.678.901/0001-23",
    razaoSocial: "CONSTRUTORA OLIVEIRA S.A.",
    nomeFantasia: "Oliveira Construções",
    telefone1: "(31) 3333-4444",
    telefone2: "(31) 98888-7777",
    email: "comercial@oliveiraconst.com.br",
    cnaePrincipal: "4120-4/00",
    descCnaePrincipal: "Construção de edifícios",
    cnaeSecundaria: "4399-1/03",
    inicioAtividades: "20/08/2010",
    porte: "Demais",
    mei: "Não",
    simples: "Não",
    capitalSocial: "R$ 5.000.000,00",
    situacaoCadastral: "Ativa",
    dataSituacao: "20/08/2010",
    motivoSituacao: "",
    matrizFilial: "Matriz",
    naturezaJuridica: "205-4 - Sociedade Anônima Fechada",
    endereco: "Av. Afonso Pena, 2000",
    complemento: "Andar 15",
    cep: "30130-005",
    bairro: "Funcionários",
    cidade: "Belo Horizonte",
    estado: "MG",
    nomeSocio: "Carlos Oliveira",
    qualificacaoSocio: "Diretor",
    faixaEtaria: "61-70 anos",
  },
  {
    cnpj: "11.222.333/0001-44",
    razaoSocial: "MARIA ARTESANATOS",
    nomeFantasia: "Ateliê da Maria",
    telefone1: "(41) 99111-2222",
    telefone2: "",
    email: "maria.artes@bol.com.br",
    cnaePrincipal: "1351-1/00",
    descCnaePrincipal: "Fabricação de artefatos têxteis",
    cnaeSecundaria: "",
    inicioAtividades: "10/01/2023",
    porte: "Microempresa",
    mei: "Sim",
    simples: "Sim",
    capitalSocial: "R$ 5.000,00",
    situacaoCadastral: "Ativa",
    dataSituacao: "10/01/2023",
    motivoSituacao: "",
    matrizFilial: "Matriz",
    naturezaJuridica: "213-5 - Empresário (Individual)",
    endereco: "Rua XV de Novembro, 300",
    complemento: "Casa 2",
    cep: "80020-310",
    bairro: "Centro",
    cidade: "Curitiba",
    estado: "PR",
    nomeSocio: "Maria Souza",
    qualificacaoSocio: "Titular",
    faixaEtaria: "21-30 anos",
  },
   {
    cnpj: "55.444.333/0001-22",
    razaoSocial: "LOGISTICA RAPIDA LTDA",
    nomeFantasia: "FastLog",
    telefone1: "(51) 3222-1111",
    telefone2: "",
    email: "sac@fastlog.com.br",
    cnaePrincipal: "4930-2/02",
    descCnaePrincipal: "Transporte rodoviário de carga",
    cnaeSecundaria: "5211-7/99",
    inicioAtividades: "12/12/2015",
    porte: "Médio Porte",
    mei: "Não",
    simples: "Não",
    capitalSocial: "R$ 500.000,00",
    situacaoCadastral: "Baixada",
    dataSituacao: "01/02/2024",
    motivoSituacao: "Extinção Voluntária",
    matrizFilial: "Matriz",
    naturezaJuridica: "206-2 - Sociedade Empresária Limitada",
    endereco: "Av. Ipiranga, 500",
    complemento: "Galpão 3",
    cep: "90160-090",
    bairro: "Menino Deus",
    cidade: "Porto Alegre",
    estado: "RS",
    nomeSocio: "Roberto Lima",
    qualificacaoSocio: "Sócio",
    faixaEtaria: "41-50 anos",
  }
];

export default function SearchCompanies() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      const filtered = MOCK_DATA.filter(company => 
        company.cnaePrincipal.includes(searchTerm) || 
        company.descCnaePrincipal.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setResults(filtered);
      setLoading(false);
      
      if (filtered.length === 0) {
        toast({
          title: "Nenhum resultado encontrado",
          description: "Tente buscar por outro CNAE (ex: 6200, 4721, 4120).",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Busca realizada",
          description: `${filtered.length} empresas encontradas.`,
        });
      }
    }, 800);
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

    const worksheet = XLSX.utils.json_to_sheet(results);
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
        
        {/* Header */}
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

        {/* Search Card */}
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
                    placeholder="Ex: 6200-0/00 ou Consultoria..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]" disabled={loading}>
                {loading ? "Buscando..." : "Buscar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
              Resultados {results.length > 0 && <span className="text-sm font-normal text-slate-500 ml-2">({results.length} registros)</span>}
            </h2>
            {results.length > 0 && (
              <Button variant="secondary" onClick={exportToExcel} className="gap-2 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
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
                      {results.map((company, index) => (
                        <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <TableCell className="font-medium font-mono text-xs">{company.cnpj}</TableCell>
                          <TableCell className="font-medium text-blue-600 dark:text-blue-400">{company.razaoSocial}</TableCell>
                          <TableCell>{company.nomeFantasia}</TableCell>
                          <TableCell className="text-sm">{company.telefone1}</TableCell>
                          <TableCell className="text-sm">{company.telefone2}</TableCell>
                          <TableCell className="text-sm text-slate-500">{company.email}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{company.cnaePrincipal}</TableCell>
                          <TableCell className="max-w-[300px] truncate" title={company.descCnaePrincipal}>{company.descCnaePrincipal}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{company.cnaeSecundaria}</TableCell>
                          <TableCell>{company.inicioAtividades}</TableCell>
                          <TableCell>{company.porte}</TableCell>
                          <TableCell>{company.mei}</TableCell>
                          <TableCell>{company.simples}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{company.capitalSocial}</TableCell>
                          <TableCell>
                            <Badge variant={company.situacaoCadastral === 'Ativa' ? 'default' : 'destructive'} className={company.situacaoCadastral === 'Ativa' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                              {company.situacaoCadastral}
                            </Badge>
                          </TableCell>
                          <TableCell>{company.dataSituacao}</TableCell>
                          <TableCell>{company.motivoSituacao}</TableCell>
                          <TableCell>{company.matrizFilial}</TableCell>
                          <TableCell className="max-w-[300px] truncate" title={company.naturezaJuridica}>{company.naturezaJuridica}</TableCell>
                          <TableCell className="max-w-[300px] truncate" title={company.endereco}>{company.endereco}</TableCell>
                          <TableCell>{company.complemento}</TableCell>
                          <TableCell>{company.cep}</TableCell>
                          <TableCell>{company.bairro}</TableCell>
                          <TableCell>{company.cidade}</TableCell>
                          <TableCell>{company.estado}</TableCell>
                          <TableCell>{company.nomeSocio}</TableCell>
                          <TableCell>{company.qualificacaoSocio}</TableCell>
                          <TableCell>{company.faixaEtaria}</TableCell>
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
                 {loading ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                        <p>Buscando dados na base...</p>
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
