import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { companies, type Company, type InsertCompany } from "@shared/schema";
import { ilike, or, sql } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  searchCompaniesByCnae(searchTerm: string): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  getAllCompanies(): Promise<Company[]>;
}

export class DatabaseStorage implements IStorage {
  async searchCompaniesByCnae(searchTerm: string): Promise<Company[]> {
    if (!searchTerm || searchTerm.trim() === "") {
      return [];
    }

    const results = await db
      .select()
      .from(companies)
      .where(
        or(
          ilike(companies.cnaePrincipal, `%${searchTerm}%`),
          ilike(companies.descCnaePrincipal, `%${searchTerm}%`)
        )
      )
      .limit(100);

    return results;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies).limit(100);
  }
}

export const storage = new DatabaseStorage();
