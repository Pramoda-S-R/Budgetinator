import { pgTable, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const chitStatus = pgEnum("chit_status", ['active', 'matured', 'closed'])
export const emotionalType = pgEnum("emotional_type", ['loan', 'support', 'gift'])
export const investmentType = pgEnum("investment_type", ['sip', 'lump_sum', 'stocks', 'mutual_fund', 'gold', 'fd', 'crypto'])
export const paymentMethod = pgEnum("payment_method", ['cash', 'upi', 'card', 'bank_transfer', 'other'])
export const riskLevel = pgEnum("risk_level", ['low', 'medium', 'high'])
export const transactionType = pgEnum("transaction_type", ['income', 'expense', 'transfer'])



