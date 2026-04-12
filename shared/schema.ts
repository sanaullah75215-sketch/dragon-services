import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, json, integer, bigint, decimal, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  options: json("options").$type<ServiceOption[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const botCommands = pgTable("bot_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commandName: text("command_name").notNull().unique(),
  description: text("description").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  usageCount: text("usage_count").default("0").notNull(),
  lastUsed: timestamp("last_used"),
});

export const userInteractions = pgTable("user_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  serviceId: text("service_id").notNull(),
  selectedOption: text("selected_option"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status").notNull().default("completed"),
});

// OSRS Skills table
export const skills = pgTable("skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // combat, gathering, artisan, support
  description: text("description"),
  icon: text("icon"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Training Methods table - multiple methods per skill
export const trainingMethods = pgTable("training_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  skillId: varchar("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "ZMI", "Lava Runes Using Magic Imbue"
  category: text("category"), // e.g., "burning logs", "wintertodt", "lava runes" - methods in same category get grouped
  description: text("description"),
  gpPerXp: decimal("gp_per_xp", { precision: 10, scale: 2 }).notNull(), // e.g., 180.00
  xpPerHour: integer("xp_per_hour").default(50000), // estimated XP/hour for time calculation
  minLevel: integer("min_level").default(1),
  maxLevel: integer("max_level").default(99),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0), // for ordering methods
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OSRS Experience table (levels 1-126)
export const experienceTable = pgTable("experience_table", {
  level: integer("level").primaryKey(),
  experience: bigint("experience", { mode: "number" }).notNull(),
  experienceToNext: bigint("experience_to_next", { mode: "number" }),
});

// OSRS Quests table
export const quests = pgTable("quests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Cooking Assistant", "Dragon Slayer"
  category: text("category").notNull(), // novice, intermediate, experienced, master, grandmaster
  description: text("description"),
  requirements: text("requirements"), // quest requirements
  icon: text("icon"), // quest icon or emoji
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quest Pricing table - pricing for quest completion services
export const questPricing = pgTable("quest_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questId: varchar("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
  serviceType: text("service_type").notNull(), // e.g., "Standard", "Express", "VIP"
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // price in GP
  duration: text("duration"), // estimated completion time
  description: text("description"), // service description
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Discount Item type for multiple services in one discount
export type DiscountItem = {
  serviceName: string; // e.g., "1-99 Agility", "Recipe for Disaster"
  originalPrice: string; // e.g., "500M GP"
  salePrice: string; // e.g., "450M GP"
};

// Special Offers table - for managing discounts and promotional offers
export const specialOffers = pgTable("special_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'skilling', 'questing', 'ironman_gathering', 'bossing', 'achievements', 'pet_hunting'
  discountPercentage: integer("discount_percentage"),
  discountAmount: text("discount_amount"),
  originalPrice: text("original_price"), // Legacy: for single-item discounts
  salePrice: text("sale_price"), // Legacy: for single-item discounts  
  items: json("items").$type<DiscountItem[]>().default([]), // Multiple items with individual prices
  offerType: text("offer_type").notNull(), // 'weekly', 'limited', 'flash', 'seasonal'
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Wallets table - tracks user account balances
export const userWallets = pgTable("user_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().unique(), // Discord user ID
  username: text("username").notNull(), // Discord username
  userType: text("user_type").default("customer").notNull(), // 'customer' or 'worker'
  profileImageUrl: text("profile_image_url"), // User avatar URL
  balanceGp: bigint("balance_gp", { mode: "number" }).default(0).notNull(), // Balance in GP
  totalDepositedGp: bigint("total_deposited_gp", { mode: "number" }).default(0).notNull(), // Lifetime deposits in GP
  workingDepositGp: bigint("working_deposit_gp", { mode: "number" }).default(0).notNull(), // Deposits locked in active orders
  totalSpentGp: bigint("total_spent_gp", { mode: "number" }).default(0).notNull(), // Lifetime spending in GP
  totalEarningsGp: bigint("total_earnings_gp", { mode: "number" }).default(0).notNull(), // For workers in GP
  completedJobs: integer("completed_jobs").default(0).notNull(), // For workers
  totalOrders: integer("total_orders").default(0).notNull(), // For customers
  manualRank: text("manual_rank"), // Admin override for customer rank: 'IRON', 'STEEL', 'BLACK', 'ADAMANT', 'RUNE'
  customerRank: decimal("customer_rank", { precision: 5, scale: 2 }).default("0.00").notNull(), // Rank percentage
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_wallets_user_id").on(table.userId),
  index("idx_user_wallets_user_type").on(table.userType),
]);

// Wallet Transactions table - tracks all wallet activity
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => userWallets.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), // Discord user ID for easy querying
  type: text("type").notNull(), // 'deposit', 'withdrawal', 'purchase', 'refund', 'bonus'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Amount in USD
  amountGp: bigint("amount_gp", { mode: "number" }), // Amount in GP (nullable for backwards compatibility)
  currency: text("currency").notNull(), // 'USD', 'GP', etc.
  description: text("description").notNull(), // Transaction description
  referenceId: text("reference_id"), // Reference to service purchase, offer, etc.
  status: text("status").default("completed").notNull(), // 'pending', 'completed', 'failed', 'cancelled'
  metadata: json("metadata").$type<Record<string, any>>().default({}), // Additional transaction data
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_wallet_transactions_wallet_id").on(table.walletId),
  index("idx_wallet_transactions_user_id").on(table.userId),
  index("idx_wallet_transactions_type").on(table.type),
  index("idx_wallet_transactions_created_at").on(table.createdAt),
]);

// Payment Methods table - for different deposit/withdrawal options
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // 'PayPal', 'Stripe', 'Bitcoin', 'OSRS GP'
  displayName: text("display_name").notNull(), // 'PayPal', 'Credit Card', 'Bitcoin', 'In-Game Gold'
  type: text("type").notNull(), // 'fiat', 'crypto', 'ingame'
  icon: text("icon"), // Payment method icon
  description: text("description"),
  address: text("address"), // Payment address, email, or ID (e.g., crypto address, PayPal email, Binance ID)
  minAmount: decimal("min_amount", { precision: 10, scale: 2 }).default("1.00"), // Minimum transaction amount
  maxAmount: decimal("max_amount", { precision: 10, scale: 2 }).default("1000.00"), // Maximum transaction amount
  feePercentage: decimal("fee_percentage", { precision: 5, scale: 2 }).default("0.00"), // Transaction fee %
  feeFixed: decimal("fee_fixed", { precision: 10, scale: 2 }).default("0.00"), // Fixed transaction fee
  isActive: boolean("is_active").default(true).notNull(),
  isDepositEnabled: boolean("is_deposit_enabled").default(true).notNull(),
  isWithdrawalEnabled: boolean("is_withdrawal_enabled").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export interface ServiceOption {
  id: string;
  name: string;
  description: string;
  price?: string;
  duration?: string;
}

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertBotCommandSchema = createInsertSchema(botCommands).omit({
  id: true,
});

export const insertUserInteractionSchema = createInsertSchema(userInteractions).omit({
  id: true,
  timestamp: true,
});

export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingMethodSchema = createInsertSchema(trainingMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuestSchema = createInsertSchema(quests).omit({
  id: true,
  createdAt: true,
});

export const insertQuestPricingSchema = createInsertSchema(questPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type BotCommand = typeof botCommands.$inferSelect;
export type InsertBotCommand = z.infer<typeof insertBotCommandSchema>;
export type UserInteraction = typeof userInteractions.$inferSelect;
export type InsertUserInteraction = z.infer<typeof insertUserInteractionSchema>;
export type Skill = typeof skills.$inferSelect;
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type TrainingMethod = typeof trainingMethods.$inferSelect;
export type InsertTrainingMethod = z.infer<typeof insertTrainingMethodSchema>;
export type Quest = typeof quests.$inferSelect;
export type InsertQuest = z.infer<typeof insertQuestSchema>;
export type QuestPricing = typeof questPricing.$inferSelect;
export type InsertQuestPricing = z.infer<typeof insertQuestPricingSchema>;
export type SpecialOffer = typeof specialOffers.$inferSelect;
export type ExperienceLevel = typeof experienceTable.$inferSelect;

export const insertSpecialOfferSchema = createInsertSchema(specialOffers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserWalletSchema = createInsertSchema(userWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSpecialOffer = z.infer<typeof insertSpecialOfferSchema>;
export type UserWallet = typeof userWallets.$inferSelect;
export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

// Orders table - main order records
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(), // Human-friendly order number like #ORD-001
  userId: text("user_id").notNull(), // Discord user ID
  username: text("username").notNull(), // Discord username for easy reference
  walletId: varchar("wallet_id").notNull().references(() => userWallets.id),
  workerId: text("worker_id"), // Discord user ID of assigned worker
  workerUsername: text("worker_username"), // Username of assigned worker
  status: text("status").default("pending").notNull(), // 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'
  totalAmountGp: bigint("total_amount_gp", { mode: "number" }).notNull(), // Total order value in GP
  originalAmountGp: bigint("original_amount_gp", { mode: "number" }).notNull(), // Before discounts
  discountApplied: integer("discount_applied").default(0).notNull(), // Discount percentage applied
  discountAmountGp: bigint("discount_amount_gp", { mode: "number" }).default(0).notNull(), // Discount amount in GP
  customerRank: text("customer_rank"), // Rank at time of order (IRON, STEEL, etc.)
  paymentStatus: text("payment_status").default("pending").notNull(), // 'pending', 'paid', 'failed', 'refunded'
  lockedDepositGp: bigint("locked_deposit_gp", { mode: "number" }).default(0).notNull(), // Deposit amount locked for this order
  notes: text("notes"), // Customer notes or special requests
  adminNotes: text("admin_notes"), // Internal admin notes
  estimatedCompletionTime: timestamp("estimated_completion_time"), // Estimated completion
  startedAt: timestamp("started_at"), // When work began
  completedAt: timestamp("completed_at"), // When order was completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_orders_user_id").on(table.userId),
  index("idx_orders_wallet_id").on(table.walletId),
  index("idx_orders_worker_id").on(table.workerId),
  index("idx_orders_status").on(table.status),
  index("idx_orders_created_at").on(table.createdAt),
]);

// Order Items table - individual services/items within an order
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  serviceType: text("service_type").notNull(), // 'skill_training', 'quest', 'custom', 'special_offer'
  serviceId: varchar("service_id"), // References services.id, skills.id, quests.id, etc.
  serviceName: text("service_name").notNull(), // Service display name
  description: text("description").notNull(), // Detailed service description
  quantity: integer("quantity").default(1).notNull(), // For multi-quantity items
  unitPriceGp: bigint("unit_price_gp", { mode: "number" }).notNull(), // Price per unit in GP
  totalPriceGp: bigint("total_price_gp", { mode: "number" }).notNull(), // Total price for this item
  configuration: json("configuration").$type<Record<string, any>>().default({}), // Service-specific config
  status: text("status").default("pending").notNull(), // 'pending', 'in_progress', 'completed', 'cancelled'
  workerUserId: text("worker_user_id"), // Assigned worker (if any)
  workerUsername: text("worker_username"), // Assigned worker username
  startedAt: timestamp("started_at"), // When work on this item began
  completedAt: timestamp("completed_at"), // When this item was completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_order_items_order_id").on(table.orderId),
  index("idx_order_items_service_type").on(table.serviceType),
  index("idx_order_items_status").on(table.status),
  index("idx_order_items_worker_user_id").on(table.workerUserId),
]);

// Order Status History table - tracks all status changes
export const orderStatusHistory = pgTable("order_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  orderItemId: varchar("order_item_id").references(() => orderItems.id, { onDelete: "cascade" }), // For item-specific updates
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  updatedBy: text("updated_by").notNull(), // User ID who made the change
  updatedByUsername: text("updated_by_username").notNull(), // Username for display
  notes: text("notes"), // Optional notes about the status change
  isSystemUpdate: boolean("is_system_update").default(false).notNull(), // True for automated updates
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_order_status_history_order_id").on(table.orderId),
  index("idx_order_status_history_created_at").on(table.createdAt),
]);

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderStatusHistorySchema = createInsertSchema(orderStatusHistory).omit({
  id: true,
  createdAt: true,
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = z.infer<typeof insertOrderStatusHistorySchema>;

// Vouches table - user reputation and trust system
export const vouches = pgTable("vouches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voucherUserId: text("voucher_user_id").notNull(), // Discord user ID who gave the vouch
  voucherUsername: text("voucher_username").notNull(), // Discord username for display
  vouchedUserId: text("vouched_user_id").notNull(), // Discord user ID who received the vouch
  vouchedUsername: text("vouched_username").notNull(), // Discord username for display
  vouchType: text("vouch_type").notNull(), // 'quality', 'trustworthy', 'reliable', 'communication', 'speed'
  isPositive: boolean("is_positive").default(true).notNull(), // true for positive, false for negative vouch
  reason: text("reason").notNull(), // Reason for the vouch
  serviceContext: text("service_context"), // What service this vouch relates to (optional)
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "set null" }), // Optional order reference
  orderNumber: text("order_number"), // Order number for easy lookup (e.g., DS-1234567890)
  isVerified: boolean("is_verified").default(false).notNull(), // Admin verified vouch
  isActive: boolean("is_active").default(true).notNull(), // For moderation (hide fake vouches)
  moderationNotes: text("moderation_notes"), // Admin notes for moderation
  moderatedBy: text("moderated_by"), // Admin who moderated this vouch
  moderatedAt: timestamp("moderated_at"), // When moderation action was taken
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_vouches_voucher_user_id").on(table.voucherUserId),
  index("idx_vouches_vouched_user_id").on(table.vouchedUserId),
  index("idx_vouches_vouch_type").on(table.vouchType),
  index("idx_vouches_is_positive").on(table.isPositive),
  index("idx_vouches_is_active").on(table.isActive),
  index("idx_vouches_created_at").on(table.createdAt),
]);

export const insertVouchSchema = createInsertSchema(vouches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Vouch = typeof vouches.$inferSelect;
export type InsertVouch = z.infer<typeof insertVouchSchema>;

// RSN Registrations table - tracks RuneScape names linked to ticket channels for Dink updates
export const rsnRegistrations = pgTable("rsn_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rsn: text("rsn").notNull(), // RuneScape Name (case-insensitive matching)
  rsnLower: text("rsn_lower").notNull(), // Lowercase version for lookups
  channelId: text("channel_id").notNull(), // Discord ticket channel ID
  guildId: text("guild_id").notNull(), // Discord server ID
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "set null" }), // Optional order reference
  orderNumber: text("order_number"), // Order number for easy lookup
  registeredBy: text("registered_by").notNull(), // User ID who registered
  registeredByUsername: text("registered_by_username").notNull(), // Username for display
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_rsn_registrations_rsn_lower").on(table.rsnLower),
  index("idx_rsn_registrations_channel_id").on(table.channelId),
  index("idx_rsn_registrations_order_id").on(table.orderId),
  index("idx_rsn_registrations_is_active").on(table.isActive),
]);

export const insertRsnRegistrationSchema = createInsertSchema(rsnRegistrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RsnRegistration = typeof rsnRegistrations.$inferSelect;
export type InsertRsnRegistration = z.infer<typeof insertRsnRegistrationSchema>;

// GP Rates table - manages OSRS GP buying/selling rates for different payment methods
export const gpRates = pgTable("gp_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  methodName: text("method_name").notNull().unique(), // e.g., "Bitcoin", "Ethereum", "USDT", "Binance", "Kucoin", "Payoneer"
  methodType: text("method_type").notNull(), // 'crypto' or 'non_crypto'
  methodCategory: text("method_category").notNull(), // 'buying' or 'selling' or 'both'
  buyingRate: decimal("buying_rate", { precision: 10, scale: 3 }), // Price per million GP when buying (e.g., 0.155)
  sellingRate: decimal("selling_rate", { precision: 10, scale: 3 }), // Price per million GP when selling (e.g., 0.110)
  icon: text("icon"), // Emoji or icon for the payment method
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0), // For ordering methods in display
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGpRateSchema = createInsertSchema(gpRates).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export type GpRate = typeof gpRates.$inferSelect;
export type InsertGpRate = z.infer<typeof insertGpRateSchema>;

// Bot Settings table - stores bot configuration that needs to persist
export const botSettings = pgTable("bot_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BotSetting = typeof botSettings.$inferSelect;

// Sythe Vouches table - tracks vouches from Sythe forum thread
export const sytheVouches = pgTable("sythe_vouches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: text("post_id").notNull().unique(), // Unique post ID from Sythe to prevent duplicates
  authorUsername: text("author_username").notNull(), // Username who left the vouch
  authorProfileUrl: text("author_profile_url"), // Link to author's Sythe profile
  vouchContent: text("vouch_content").notNull(), // The vouch message content
  postUrl: text("post_url"), // Direct link to the vouch post
  postedAt: timestamp("posted_at"), // When the vouch was posted on Sythe
  discordMessageId: text("discord_message_id"), // Discord message ID after posting
  isPosted: boolean("is_posted").default(false).notNull(), // Whether it's been posted to Discord
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_sythe_vouches_post_id").on(table.postId),
  index("idx_sythe_vouches_is_posted").on(table.isPosted),
]);

export const insertSytheVouchSchema = createInsertSchema(sytheVouches).omit({
  id: true,
  createdAt: true,
});

export type SytheVouch = typeof sytheVouches.$inferSelect;
export type InsertSytheVouch = z.infer<typeof insertSytheVouchSchema>;
