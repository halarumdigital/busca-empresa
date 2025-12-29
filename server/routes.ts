import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEmpresaSchema, loginSchema, adminCreateUserSchema, updateUserSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// Middleware para verificar autenticação
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  next();
}

// Middleware para verificar se é admin
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const user = await storage.getUserById(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado. Apenas administradores." });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ==================== ROTAS DE AUTENTICAÇÃO ====================

  // Criar novo usuário (apenas admin)
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const validationResult = adminCreateUserSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: fromZodError(validationResult.error).message
        });
      }

      const { nome, email, senha, role } = validationResult.data;

      // Verificar se email já existe
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          error: "Este email já está cadastrado"
        });
      }

      // Criar usuário
      const user = await storage.createUser({ nome, email, senha, role: role || "user" });

      return res.status(201).json({
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role
      });
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      return res.status(500).json({
        error: "Erro ao criar usuário"
      });
    }
  });

  // Listar todos os usuários (apenas admin)
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Não retorna a senha
      const safeUsers = users.map(u => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt
      }));
      return res.json(safeUsers);
    } catch (error: any) {
      console.error("Erro ao listar usuários:", error);
      return res.status(500).json({
        error: "Erro ao listar usuários"
      });
    }
  });

  // Atualizar usuário (apenas admin)
  app.put("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      const validationResult = updateUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: fromZodError(validationResult.error).message
        });
      }

      const { nome, email, senha } = validationResult.data;

      // Se estiver alterando o email, verificar se já existe
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({
            error: "Este email já está cadastrado"
          });
        }
      }

      const updated = await storage.updateUser(userId, { nome, email, senha });
      if (!updated) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      return res.json({
        id: updated.id,
        nome: updated.nome,
        email: updated.email,
        role: updated.role
      });
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      return res.status(500).json({
        error: "Erro ao atualizar usuário"
      });
    }
  });

  // Excluir usuário (apenas admin)
  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      // Não permitir excluir a si mesmo
      if (userId === req.session.userId) {
        return res.status(400).json({
          error: "Você não pode excluir sua própria conta"
        });
      }

      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      return res.json({ message: "Usuário excluído com sucesso" });
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      return res.status(500).json({
        error: "Erro ao excluir usuário"
      });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: fromZodError(validationResult.error).message
        });
      }

      const { email, senha } = validationResult.data;

      const user = await storage.verifyPassword(email, senha);
      if (!user) {
        return res.status(401).json({
          error: "Email ou senha inválidos"
        });
      }

      // Iniciar sessão
      req.session.userId = user.id;

      return res.json({
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role
      });
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);
      return res.status(500).json({
        error: "Erro ao fazer login"
      });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao fazer logout" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Obter usuário atual
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      return res.json({
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role
      });
    } catch (error: any) {
      console.error("Erro ao obter usuário:", error);
      return res.status(500).json({
        error: "Erro ao obter usuário"
      });
    }
  });

  // ==================== ROTAS DE EMPRESAS ====================

  app.get("/api/empresas/search", requireAuth, async (req, res) => {
    try {
      const { cnae, page = "1", pageSize = "50", estado, includeSecondary } = req.query;

      if (!cnae || typeof cnae !== "string") {
        return res.status(400).json({
          error: "O parâmetro 'cnae' é obrigatório"
        });
      }

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 50));
      const estadoStr = typeof estado === "string" ? estado : undefined;
      const searchSecondary = includeSecondary === "true";

      const result = await storage.searchEmpresasByCnae(cnae, pageNum, pageSizeNum, estadoStr, searchSecondary);
      return res.json(result);
    } catch (error: any) {
      console.error("Erro ao buscar empresas:", error);
      return res.status(500).json({
        error: "Erro ao buscar empresas"
      });
    }
  });

  // Rota separada para contagem total (pode demorar)
  app.get("/api/empresas/count", requireAuth, async (req, res) => {
    try {
      const { cnae, estado, includeSecondary } = req.query;

      if (!cnae || typeof cnae !== "string") {
        return res.status(400).json({
          error: "O parâmetro 'cnae' é obrigatório"
        });
      }

      const estadoStr = typeof estado === "string" ? estado : undefined;
      const searchSecondary = includeSecondary === "true";
      const count = await storage.countEmpresasByCnae(cnae, estadoStr, searchSecondary);
      return res.json({ count });
    } catch (error: any) {
      console.error("Erro ao contar empresas:", error);
      return res.status(500).json({
        error: "Erro ao contar empresas"
      });
    }
  });

  app.post("/api/empresas", requireAuth, async (req, res) => {
    try {
      const validationResult = insertEmpresaSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: fromZodError(validationResult.error).message
        });
      }

      const empresa = await storage.createEmpresa(validationResult.data);
      return res.status(201).json(empresa);
    } catch (error: any) {
      console.error("Erro ao criar empresa:", error);
      return res.status(500).json({
        error: "Erro ao criar empresa"
      });
    }
  });

  app.get("/api/empresas", requireAuth, async (req, res) => {
    try {
      const empresas = await storage.getAllEmpresas();
      return res.json(empresas);
    } catch (error: any) {
      console.error("Erro ao listar empresas:", error);
      return res.status(500).json({
        error: "Erro ao listar empresas"
      });
    }
  });

  return httpServer;
}
