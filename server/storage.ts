import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { empresas, type Empresa, type InsertEmpresa } from "@shared/schema";
import { sql, and, inArray } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  searchEmpresasByCnae(searchTerm: string, page: number, pageSize: number, estado?: string, includeSecondary?: boolean): Promise<{ data: Empresa[]; total: number; hasMore: boolean }>;
  countEmpresasByCnae(searchTerm: string, estado?: string, includeSecondary?: boolean): Promise<number>;
  createEmpresa(empresa: InsertEmpresa): Promise<Empresa>;
  getAllEmpresas(): Promise<Empresa[]>;
}

export class DatabaseStorage implements IStorage {
  async searchEmpresasByCnae(searchTerm: string, page: number = 1, pageSize: number = 50, estado?: string, includeSecondary: boolean = false): Promise<{ data: Empresa[]; total: number; hasMore: boolean }> {
    if (!searchTerm || searchTerm.trim() === "") {
      return { data: [], total: 0, hasMore: false };
    }

    // Remove formatação do CNAE (hífens, barras, pontos) e separa por vírgula
    const cleanedTerm = searchTerm.replace(/[-\/\.]/g, "").trim();

    const offset = (page - 1) * pageSize;

    // Verifica se são múltiplos CNAEs (separados por vírgula)
    const cnaeCodes = cleanedTerm.split(",").map(c => c.trim()).filter(c => c.length > 0);
    const isMultipleCnaes = cnaeCodes.length > 1 && cnaeCodes.every(c => /^\d+$/.test(c));

    // Query otimizada - busca por código exato é muito mais rápido
    const isNumericSearch = /^\d+$/.test(cleanedTerm) || isMultipleCnaes;

    // Filtro base de telefone válido
    const conditions = [sql`LENGTH(${empresas.telefone1}) >= 14`];

    // Adiciona filtro de estado se fornecido
    if (estado && estado.trim() !== "") {
      conditions.push(sql`${empresas.estado} = ${estado.toUpperCase().trim()}`);
    }

    if (isMultipleCnaes) {
      // Busca por múltiplos CNAEs usando IN ou OR com secundário
      if (includeSecondary) {
        // Constrói condição: cnae_principal IN (...) OR cnae_secundaria LIKE qualquer um
        const secondaryConditions = cnaeCodes.map(code => `cnae_secundaria LIKE '%${code}%'`).join(" OR ");
        conditions.push(sql`(${inArray(empresas.cnaePrincipal, cnaeCodes)} OR (${sql.raw(secondaryConditions)}))`);
      } else {
        conditions.push(inArray(empresas.cnaePrincipal, cnaeCodes));
      }
    } else if (isNumericSearch) {
      // Busca por código CNAE exato único (muito mais rápido)
      if (includeSecondary) {
        // Busca no principal OU no secundário (secundário pode ter múltiplos códigos separados por vírgula)
        conditions.push(sql`(${empresas.cnaePrincipal} = ${cleanedTerm} OR ${empresas.cnaeSecundaria} LIKE ${`%${cleanedTerm}%`})`);
      } else {
        conditions.push(sql`${empresas.cnaePrincipal} = ${cleanedTerm}`);
      }
    } else {
      // Busca por descrição com unaccent (ignora acentos)
      conditions.push(sql`f_unaccent(${empresas.descricaoCnaePrincipal}) ILIKE f_unaccent(${`%${searchTerm}%`})`);
    }

    const whereCondition = and(...conditions);

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

    // Total estimado (não faz COUNT que é muito lento)
    const total = hasMore ? -1 : offset + data.length;

    return { data, total, hasMore };
  }

  async countEmpresasByCnae(searchTerm: string, estado?: string, includeSecondary: boolean = false): Promise<number> {
    if (!searchTerm || searchTerm.trim() === "") {
      return 0;
    }

    const cleanedTerm = searchTerm.replace(/[-\/\.]/g, "").trim();
    const estadoFilter = estado && estado.trim() !== "" ? estado.toUpperCase().trim() : null;

    // Verifica se são múltiplos CNAEs (separados por vírgula)
    const cnaeCodes = cleanedTerm.split(",").map(c => c.trim()).filter(c => c.length > 0);
    const isMultipleCnaes = cnaeCodes.length > 1 && cnaeCodes.every(c => /^\d+$/.test(c));
    const isNumericSearch = /^\d+$/.test(cleanedTerm) || isMultipleCnaes;

    // Para busca numérica (CNAE exato), faz COUNT normal (é rápido com índice)
    if (isNumericSearch) {
      const conditions = [
        sql`LENGTH(${empresas.telefone1}) >= 14`
      ];

      // Adiciona condição de CNAE (principal ou secundário)
      if (isMultipleCnaes) {
        if (includeSecondary) {
          const secondaryConditions = cnaeCodes.map(code => `cnae_secundaria LIKE '%${code}%'`).join(" OR ");
          conditions.push(sql`(${inArray(empresas.cnaePrincipal, cnaeCodes)} OR (${sql.raw(secondaryConditions)}))`);
        } else {
          conditions.push(inArray(empresas.cnaePrincipal, cnaeCodes));
        }
      } else {
        if (includeSecondary) {
          conditions.push(sql`(${empresas.cnaePrincipal} = ${cleanedTerm} OR ${empresas.cnaeSecundaria} LIKE ${`%${cleanedTerm}%`})`);
        } else {
          conditions.push(sql`${empresas.cnaePrincipal} = ${cleanedTerm}`);
        }
      }

      if (estadoFilter) {
        conditions.push(sql`${empresas.estado} = ${estadoFilter}`);
      }

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(empresas)
        .where(and(...conditions));

      return Number(countResult[0]?.count || 0);
    }

    // Para busca por texto, faz COUNT real (temos índice com unaccent)
    const conditions = [
      sql`f_unaccent(${empresas.descricaoCnaePrincipal}) ILIKE f_unaccent(${`%${searchTerm}%`})`,
      sql`LENGTH(${empresas.telefone1}) >= 14`
    ];

    if (estadoFilter) {
      conditions.push(sql`${empresas.estado} = ${estadoFilter}`);
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(empresas)
      .where(and(...conditions));

    return Number(countResult[0]?.count || 0);
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
