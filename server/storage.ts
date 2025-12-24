import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { empresas, type Empresa, type InsertEmpresa } from "@shared/schema";
import { ilike, sql, and } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  searchEmpresasByCnae(searchTerm: string, page: number, pageSize: number): Promise<{ data: Empresa[]; total: number; hasMore: boolean }>;
  createEmpresa(empresa: InsertEmpresa): Promise<Empresa>;
  getAllEmpresas(): Promise<Empresa[]>;
}

export class DatabaseStorage implements IStorage {
  async searchEmpresasByCnae(searchTerm: string, page: number = 1, pageSize: number = 50): Promise<{ data: Empresa[]; total: number; hasMore: boolean }> {
    if (!searchTerm || searchTerm.trim() === "") {
      return { data: [], total: 0, hasMore: false };
    }

    // Remove formatação do CNAE (hífens, barras, pontos)
    const cleanedTerm = searchTerm.replace(/[-\/\.]/g, "").trim();

    const offset = (page - 1) * pageSize;

    // Query otimizada - busca por código exato é muito mais rápido
    const isNumericSearch = /^\d+$/.test(cleanedTerm);

    let whereCondition;

    if (isNumericSearch) {
      // Busca por código CNAE exato (muito mais rápido)
      whereCondition = and(
        sql`${empresas.cnaePrincipal} = ${cleanedTerm}`,
        sql`LENGTH(${empresas.telefone1}) >= 14`
      );
    } else {
      // Busca por descrição (usa ILIKE, mais lento)
      whereCondition = and(
        ilike(empresas.descricaoCnaePrincipal, `%${searchTerm}%`),
        sql`LENGTH(${empresas.telefone1}) >= 14`
      );
    }

    // Busca pageSize + 1 para saber se há mais páginas (evita COUNT lento)
    const data = await db
      .select()
      .from(empresas)
      .where(whereCondition)
      .limit(pageSize + 1)
      .offset(offset);

    const hasMore = data.length > pageSize;
    if (hasMore) {
      data.pop(); // Remove o registro extra
    }

    // Total estimado baseado na página atual
    const total = hasMore ? (page * pageSize) + 1 : offset + data.length;

    return { data, total, hasMore };
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
