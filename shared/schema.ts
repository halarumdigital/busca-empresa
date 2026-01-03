import { pgTable, text, varchar, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabela de usuários
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  senha: text("senha").notNull(),
  role: varchar("role", { length: 20 }).default("user").notNull(), // admin ou user
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const registerSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmarSenha: z.string().min(6, "Confirmação de senha é obrigatória"),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "As senhas não conferem",
  path: ["confirmarSenha"],
});

// Schema para admin criar usuários (inclui role)
export const adminCreateUserSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  role: z.enum(["admin", "user"]).default("user"),
});

// Schema para atualizar usuário
export const updateUserSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const empresas = pgTable("empresas", {
  id: serial("id").primaryKey(),
  cnpj: varchar("cnpj", { length: 18 }),
  razaoSocial: text("razao_social"),
  nomeFantasia: text("nome_fantasia"),
  telefone1: varchar("telefone_1", { length: 20 }),
  telefone2: varchar("telefone_2", { length: 20 }),
  email: varchar("email", { length: 255 }),
  cnaePrincipal: varchar("cnae_principal", { length: 20 }),
  descricaoCnaePrincipal: text("descricao_cnae_principal"),
  cnaeSecundaria: varchar("cnae_secundaria", { length: 20 }),
  inicioAtividades: varchar("inicio_atividades", { length: 10 }),
  porte: varchar("porte", { length: 50 }),
  mei: varchar("mei", { length: 3 }),
  simples: varchar("simples", { length: 3 }),
  capitalSocial: varchar("capital_social", { length: 50 }),
  situacaoCadastral: varchar("situacao_cadastral", { length: 50 }),
  dataSituacaoCadastral: varchar("data_situacao_cadastral", { length: 10 }),
  motivoSituacaoCadastral: text("motivo_situacao_cadastral"),
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

export const insertEmpresaSchema = createInsertSchema(empresas).omit({
  id: true,
});

export type InsertEmpresa = z.infer<typeof insertEmpresaSchema>;
export type Empresa = typeof empresas.$inferSelect;

// Tabela de SDRs
export const sdrs = pgTable("sdrs", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  ddd: varchar("ddd", { length: 5 }).notNull(),
  ativo: varchar("ativo", { length: 3 }).default("sim").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSdrSchema = createInsertSchema(sdrs).omit({
  id: true,
  createdAt: true,
});

export type InsertSdr = z.infer<typeof insertSdrSchema>;
export type Sdr = typeof sdrs.$inferSelect;

// Tabela de empresas exportadas (controle de duplicidade)
export const empresasExportadas = pgTable("empresas_exportadas", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresa_id").notNull(),
  sdrId: integer("sdr_id").notNull(),
  sdrNome: varchar("sdr_nome", { length: 100 }).notNull(),
  cnae: varchar("cnae", { length: 20 }),
  dataExportacao: timestamp("data_exportacao").defaultNow().notNull(),
});

export const insertEmpresaExportadaSchema = createInsertSchema(empresasExportadas).omit({
  id: true,
  dataExportacao: true,
});

export type InsertEmpresaExportada = z.infer<typeof insertEmpresaExportadaSchema>;
export type EmpresaExportada = typeof empresasExportadas.$inferSelect;
