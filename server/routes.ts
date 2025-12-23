import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCompanySchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/companies/search", async (req, res) => {
    try {
      const { cnae } = req.query;
      
      if (!cnae || typeof cnae !== "string") {
        return res.status(400).json({ 
          error: "O parâmetro 'cnae' é obrigatório" 
        });
      }

      const companies = await storage.searchCompaniesByCnae(cnae);
      return res.json(companies);
    } catch (error: any) {
      console.error("Erro ao buscar empresas:", error);
      return res.status(500).json({ 
        error: "Erro ao buscar empresas" 
      });
    }
  });

  app.post("/api/companies", async (req, res) => {
    try {
      const validationResult = insertCompanySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: fromZodError(validationResult.error).message 
        });
      }

      const company = await storage.createCompany(validationResult.data);
      return res.status(201).json(company);
    } catch (error: any) {
      console.error("Erro ao criar empresa:", error);
      return res.status(500).json({ 
        error: "Erro ao criar empresa" 
      });
    }
  });

  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      return res.json(companies);
    } catch (error: any) {
      console.error("Erro ao listar empresas:", error);
      return res.status(500).json({ 
        error: "Erro ao listar empresas" 
      });
    }
  });

  return httpServer;
}
