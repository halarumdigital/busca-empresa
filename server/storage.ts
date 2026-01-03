import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { empresas, users, sdrs, empresasExportadas, type Empresa, type InsertEmpresa, type User, type InsertUser, type Sdr, type EmpresaExportada } from "@shared/schema";
import { sql, and, inArray, eq, notInArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
  // Métodos de usuário
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  verifyPassword(email: string, senha: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, data: { nome?: string; email?: string; senha?: string }): Promise<User | null>;
  deleteUser(id: number): Promise<boolean>;
  createAdminIfNotExists(): Promise<void>;
  // Métodos de SDR e exportação
  getAllSdrs(): Promise<Sdr[]>;
  getEmpresasParaExportar(cnaes: string[], ddd: string, limite: number): Promise<Empresa[]>;
  marcarEmpresasExportadas(empresaIds: number[], sdrId: number, sdrNome: string, cnae: string): Promise<void>;
  getEstatisticasExportacao(): Promise<{ sdrNome: string; total: number; ultimaExportacao: Date | null }[]>;
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

  // Métodos de usuário
  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.senha, 10);
    const [newUser] = await db.insert(users).values({
      ...user,
      senha: hashedPassword,
    }).returning();
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user || null;
  }

  async getUserById(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || null;
  }

  async verifyPassword(email: string, senha: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(senha, user.senha);
    if (!isValid) return null;

    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUser(id: number, data: { nome?: string; email?: string; senha?: string }): Promise<User | null> {
    const updateData: Partial<{ nome: string; email: string; senha: string }> = {};

    if (data.nome) updateData.nome = data.nome;
    if (data.email) updateData.email = data.email;
    if (data.senha) updateData.senha = await bcrypt.hash(data.senha, 10);

    if (Object.keys(updateData).length === 0) return null;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return updated || null;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async createAdminIfNotExists(): Promise<void> {
    const adminEmail = "admin@admin.com";
    const existingAdmin = await this.getUserByEmail(adminEmail);

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.insert(users).values({
        nome: "Administrador",
        email: adminEmail,
        senha: hashedPassword,
        role: "admin",
      });
      console.log("Usuário admin criado: admin@admin.com / admin123");
    }
  }

  // Métodos de SDR e exportação
  async getAllSdrs(): Promise<Sdr[]> {
    return await db.select().from(sdrs).where(eq(sdrs.ativo, "sim"));
  }

  async getEmpresasParaExportar(cnaes: string[], ddd: string, limite: number): Promise<Empresa[]> {
    // Busca IDs das empresas já exportadas
    const exportadas = await db.select({ empresaId: empresasExportadas.empresaId }).from(empresasExportadas);
    const idsExportados = exportadas.map(e => e.empresaId);

    // Monta condições de busca
    const conditions = [
      sql`LENGTH(${empresas.telefone1}) >= 14`,
      // Telefone começa com o DDD (formato: 55(XX)XXXXXXXX)
      sql`${empresas.telefone1} LIKE ${`55(${ddd})%`}`,
    ];

    // Condição de CNAE (principal OU secundário)
    if (cnaes.length === 1) {
      conditions.push(sql`(${empresas.cnaePrincipal} = ${cnaes[0]} OR ${empresas.cnaeSecundaria} LIKE ${`%${cnaes[0]}%`})`);
    } else {
      const secondaryConditions = cnaes.map(code => `cnae_secundaria LIKE '%${code}%'`).join(" OR ");
      conditions.push(sql`(${inArray(empresas.cnaePrincipal, cnaes)} OR (${sql.raw(secondaryConditions)}))`);
    }

    // Exclui empresas já exportadas
    if (idsExportados.length > 0) {
      conditions.push(notInArray(empresas.id, idsExportados));
    }

    const result = await db
      .select()
      .from(empresas)
      .where(and(...conditions))
      .limit(limite);

    return result;
  }

  async marcarEmpresasExportadas(empresaIds: number[], sdrId: number, sdrNome: string, cnae: string): Promise<void> {
    if (empresaIds.length === 0) return;

    const values = empresaIds.map(id => ({
      empresaId: id,
      sdrId,
      sdrNome,
      cnae,
    }));

    await db.insert(empresasExportadas).values(values);
  }

  async getEstatisticasExportacao(): Promise<{ sdrNome: string; total: number; ultimaExportacao: Date | null }[]> {
    const result = await db.execute(sql`
      SELECT
        sdr_nome as "sdrNome",
        COUNT(*) as total,
        MAX(data_exportacao) as "ultimaExportacao"
      FROM empresas_exportadas
      GROUP BY sdr_nome
      ORDER BY sdr_nome
    `);

    return result.rows as { sdrNome: string; total: number; ultimaExportacao: Date | null }[];
  }
}

export const storage = new DatabaseStorage();

// Criar admin automaticamente ao iniciar
storage.createAdminIfNotExists().catch(console.error);
