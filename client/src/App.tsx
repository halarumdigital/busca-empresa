import { useState, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import SearchCompanies from "@/pages/search-companies";
import LoginPage from "@/pages/login";
import UsersPage from "@/pages/users";
import { Loader2 } from "lucide-react";

interface User {
  id: number;
  nome: string;
  email: string;
  role: "admin" | "user";
}

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [location] = useLocation();

  // Verificar se usuario esta logado ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        // Usuario nao autenticado
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      // Ignora erros de logout
    }
    setUser(null);
  };

  // Tela de carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-slate-500">Carregando...</p>
        </div>
      </div>
    );
  }

  // Rotas publicas (login) - redireciona para home se ja logado
  if (!user && (location === "/" || location === "/search" || location === "/users")) {
    return <Redirect to="/login" />;
  }

  if (user && location === "/login") {
    return <Redirect to="/" />;
  }

  // Protege rota /users para apenas admins
  if (user && user.role !== "admin" && location === "/users") {
    return <Redirect to="/" />;
  }

  return (
    <Switch>
      <Route path="/login">
        <LoginPage onLogin={handleLogin} />
      </Route>
      <Route path="/users">
        <UsersPage user={user} onLogout={handleLogout} />
      </Route>
      <Route path="/">
        <SearchCompanies user={user} onLogout={handleLogout} />
      </Route>
      <Route path="/search">
        <SearchCompanies user={user} onLogout={handleLogout} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
