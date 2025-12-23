import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEmpresaSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/empresas/search", async (req, res) => {
    try {
      const { cnae, page = "1", pageSize = "50" } = req.query;

      if (!cnae || typeof cnae !== "string") {
        return res.status(400).json({
          error: "O parâmetro 'cnae' é obrigatório"
        });
      }

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 50));

      const result = await storage.searchEmpresasByCnae(cnae, pageNum, pageSizeNum);
      return res.json(result);
    } catch (error: any) {
      console.error("Erro ao buscar empresas:", error);
      return res.status(500).json({
        error: "Erro ao buscar empresas"
      });
    }
  });

  app.post("/api/empresas", async (req, res) => {
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

  app.get("/api/empresas", async (req, res) => {
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
