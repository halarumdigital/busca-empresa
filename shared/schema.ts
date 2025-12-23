import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  cnpj: varchar("cnpj", { length: 18 }).notNull(),
  razaoSocial: text("razao_social").notNull(),
  nomeFantasia: text("nome_fantasia"),
  telefone1: varchar("telefone1", { length: 20 }),
  telefone2: varchar("telefone2", { length: 20 }),
  email: varchar("email", { length: 255 }),
  cnaePrincipal: varchar("cnae_principal", { length: 20 }).notNull(),
  descCnaePrincipal: text("desc_cnae_principal"),
  cnaeSecundaria: varchar("cnae_secundaria", { length: 20 }),
  inicioAtividades: varchar("inicio_atividades", { length: 10 }),
  porte: varchar("porte", { length: 50 }),
  mei: varchar("mei", { length: 3 }),
  simples: varchar("simples", { length: 3 }),
  capitalSocial: varchar("capital_social", { length: 50 }),
  situacaoCadastral: varchar("situacao_cadastral", { length: 50 }),
  dataSituacao: varchar("data_situacao", { length: 10 }),
  motivoSituacao: text("motivo_situacao"),
  matrizFilial: varchar("matriz_filial", { length: 20 }),
  naturezaJuridica: text("natureza_juridica"),
  endereco: text("endereco"),
  complemento: text("complemento"),
  cep: varchar("cep", { length: 10 }),
  bairro: varchar("bairro", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  nomeSocio: text("nome_socio"),
  qualificacaoSocio: text("qualificacao_socio"),
  faixaEtaria: varchar("faixa_etaria", { length: 20 }),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
