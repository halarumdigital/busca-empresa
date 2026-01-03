import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Loader2, Home, LogOut, User as UserIcon, FileSpreadsheet, Download, RefreshCw, Users, Phone, Building2, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";

interface User {
  id: number;
  nome: string;
  email: string;
  role: "admin" | "user";
}

interface Sdr {
  id: number;
  nome: string;
  ddd: string;
  ativo: string;
}

interface PreviewItem {
  sdrId: number;
  sdrNome: string;
  ddd: string;
  disponiveis: number;
}

interface Empresa {
  id: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  telefone1: string;
  telefone2: string;
  email: string;
  cnaePrincipal: string;
  descricaoCnaePrincipal: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  nomeSocio: string;
}

interface GerarResult {
  sucesso: boolean;
  dataExportacao: string;
  listas: {
    sdr: string;
    ddd: string;
    empresas: Empresa[];
    total: number;
  }[];
  totalGeral: number;
}

interface GerarListasPageProps {
  user: User | null;
  onLogout: () => void;
}

// CNAEs de imobiliarias
const CNAES_IMOBILIARIAS = ["6821801", "6822600"];

export default function GerarListasPage({ user, onLogout }: GerarListasPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resultado, setResultado] = useState<GerarResult | null>(null);

  // Buscar SDRs
  const { data: sdrs } = useQuery<Sdr[]>({
    queryKey: ["/api/sdrs"],
    queryFn: async () => {
      const response = await fetch("/api/sdrs", { credentials: "include" });
      if (!response.ok) throw new Error("Erro ao buscar SDRs");
      return response.json();
    },
  });

  // Preview de empresas disponiveis
  const { data: preview, isLoading: isLoadingPreview, refetch: refetchPreview } = useQuery<PreviewItem[]>({
    queryKey: ["/api/exportacao/preview", CNAES_IMOBILIARIAS],
    queryFn: async () => {
      const response = await fetch(`/api/exportacao/preview?cnaes=${CNAES_IMOBILIARIAS.join(",")}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao buscar preview");
      return response.json();
    },
  });

  // Estatisticas de exportacao
  const { data: stats } = useQuery<{ sdrNome: string; total: number; ultimaExportacao: string | null }[]>({
    queryKey: ["/api/exportacao/stats"],
    queryFn: async () => {
      const response = await fetch("/api/exportacao/stats", { credentials: "include" });
      if (!response.ok) throw new Error("Erro ao buscar estatisticas");
      return response.json();
    },
  });

  // Mutation para gerar listas
  const gerarMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/exportacao/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnaes: CNAES_IMOBILIARIAS, limite: 50 }),
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao gerar listas");
      return result as GerarResult;
    },
    onSuccess: (data) => {
      setResultado(data);
      queryClient.invalidateQueries({ queryKey: ["/api/exportacao/preview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exportacao/stats"] });
      toast({
        title: "Listas geradas!",
        description: `${data.totalGeral} empresas exportadas para ${data.listas.length} SDRs.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao gerar listas", description: error.message, variant: "destructive" });
    },
  });

  const downloadExcel = (lista: { sdr: string; empresas: Empresa[] }) => {
    if (lista.empresas.length === 0) {
      toast({ title: "Lista vazia", description: "Nao ha empresas para exportar.", variant: "destructive" });
      return;
    }

    const data = lista.empresas.map((e) => ({
      CNPJ: e.cnpj,
      "Razao Social": e.razaoSocial,
      "Nome Fantasia": e.nomeFantasia,
      "Telefone 1": e.telefone1,
      "Telefone 2": e.telefone2,
      Email: e.email,
      CNAE: e.cnaePrincipal,
      "Descricao CNAE": e.descricaoCnaePrincipal,
      Endereco: e.endereco,
      Bairro: e.bairro,
      Cidade: e.cidade,
      Estado: e.estado,
      CEP: e.cep,
      Socio: e.nomeSocio,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empresas");

    const hoje = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `${lista.sdr}_${hoje}.xlsx`);

    toast({ title: "Download iniciado", description: `Arquivo ${lista.sdr}_${hoje}.xlsx` });
  };

  const downloadTodos = () => {
    if (!resultado) return;
    resultado.listas.forEach((lista) => {
      if (lista.empresas.length > 0) {
        downloadExcel(lista);
      }
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalDisponivel = preview?.reduce((acc, p) => acc + p.disponiveis, 0) || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 font-sans">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              Gerar Listas para SDRs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gere listas de imobiliarias automaticamente para cada SDR por DDD.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/")} className="gap-2">
              <Home className="h-4 w-4" />
              Voltar
            </Button>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <UserIcon className="h-4 w-4" />
                    {user.nome}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm text-slate-500">{user.email}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Card de configuracao */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Segmento: Imobiliarias
            </CardTitle>
            <CardDescription>
              CNAEs: {CNAES_IMOBILIARIAS.join(", ")} (Corretagem de imoveis e Gestao imobiliaria)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-lg py-2 px-4">
                50 empresas por SDR
              </Badge>
              <Button variant="outline" size="sm" onClick={() => refetchPreview()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Atualizar Preview
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview por SDR */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Empresas Disponiveis por SDR
            </CardTitle>
            <CardDescription>
              {totalDisponivel > 0
                ? `${totalDisponivel} empresas disponiveis no total`
                : "Nenhuma empresa disponivel para exportar"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPreview ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {preview?.map((p) => (
                  <div
                    key={p.sdrId}
                    className="border rounded-lg p-4 bg-white dark:bg-slate-800 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg">{p.sdrNome}</span>
                      <Badge variant="secondary" className="gap-1">
                        <Phone className="h-3 w-3" />
                        {p.ddd}
                      </Badge>
                    </div>
                    <div className="text-3xl font-bold text-green-600">{p.disponiveis}</div>
                    <div className="text-sm text-slate-500">empresas disponiveis</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 gap-2 text-lg px-8"
                onClick={() => gerarMutation.mutate()}
                disabled={gerarMutation.isPending || totalDisponivel === 0}
              >
                {gerarMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-5 w-5" />
                    Gerar Listas do Dia
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultado da geracao */}
        {resultado && (
          <Card className="border-green-200 dark:border-green-800 shadow-sm bg-green-50 dark:bg-green-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                Listas Geradas com Sucesso!
              </CardTitle>
              <CardDescription>
                {resultado.totalGeral} empresas exportadas em {formatDate(resultado.dataExportacao)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {resultado.listas.map((lista) => (
                    <div
                      key={lista.sdr}
                      className="border rounded-lg p-4 bg-white dark:bg-slate-800 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{lista.sdr}</span>
                        <Badge variant="outline">{lista.ddd}</Badge>
                      </div>
                      <div className="text-2xl font-bold text-blue-600 mb-3">{lista.total}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => downloadExcel(lista)}
                        disabled={lista.total === 0}
                      >
                        <Download className="h-4 w-4" />
                        Baixar Excel
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-4 border-t">
                  <Button size="lg" className="gap-2" onClick={downloadTodos}>
                    <Download className="h-5 w-5" />
                    Baixar Todos os Arquivos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estatisticas de exportacao */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle>Historico de Exportacoes</CardTitle>
            <CardDescription>Total de empresas exportadas por SDR</CardDescription>
          </CardHeader>
          <CardContent>
            {stats && stats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">SDR</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Total Exportado</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Ultima Exportacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s) => (
                      <tr key={s.sdrNome} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3 font-medium">{s.sdrNome}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{s.total} empresas</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(s.ultimaExportacao)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Nenhuma exportacao realizada ainda.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
