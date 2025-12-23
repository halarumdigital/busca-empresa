import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { empresas, type Empresa, type InsertEmpresa } from "@shared/schema";
import { ilike, or, sql } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  searchEmpresasByCnae(searchTerm: string, page: number, pageSize: number): Promise<{ data: Empresa[]; total: number }>;
  createEmpresa(empresa: InsertEmpresa): Promise<Empresa>;
  getAllEmpresas(): Promise<Empresa[]>;
}

export class DatabaseStorage implements IStorage {
  async searchEmpresasByCnae(searchTerm: string, page: number = 1, pageSize: number = 50): Promise<{ data: Empresa[]; total: number }> {
    if (!searchTerm || searchTerm.trim() === "") {
      return { data: [], total: 0 };
    }

    // Remove formatação do CNAE (hífens, barras, pontos)
    const cleanedTerm = searchTerm.replace(/[-\/\.]/g, "").trim();

    const whereCondition = or(
      ilike(empresas.cnaePrincipal, `%${cleanedTerm}%`),
      ilike(empresas.descricaoCnaePrincipal, `%${searchTerm}%`)
    );

    // Conta o total de registros
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(empresas)
      .where(whereCondition);

    const total = Number(countResult[0]?.count || 0);

    // Busca os dados com paginação
    const offset = (page - 1) * pageSize;
    const data = await db
      .select()
      .from(empresas)
      .where(whereCondition)
      .limit(pageSize)
      .offset(offset);

    return { data, total };
  }

  async createEmpresa(empresa: InsertEmpresa): Promise<Empresa> {
    const [newEmpresa] = await db.insert(empresas).values(empresa).returning();
    return newEmpresa;
  }

  async getAllEmpresas(): Promise<Empresa[]> {
    return await db.select().from(empresas).limit(100);
  }
}

export const storage = new DatabaseStorage();
