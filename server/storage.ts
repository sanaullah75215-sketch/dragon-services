import { sql, eq, desc, asc, and, or, inArray } from 'drizzle-orm';
import { db } from './db';
import {
  services, insertServiceSchema, type Service, type InsertService,
  skills, insertSkillSchema, type Skill, type InsertSkill,
  trainingMethods, type TrainingMethod, type InsertTrainingMethod,
  quests, insertQuestSchema, type Quest, type InsertQuest,
  questPricing, type QuestPricing, type InsertQuestPricing,
  specialOffers, insertSpecialOfferSchema, type SpecialOffer, type InsertSpecialOffer,
  userWallets, insertUserWalletSchema, type UserWallet, type InsertUserWallet,
  walletTransactions, insertWalletTransactionSchema, type WalletTransaction, type InsertWalletTransaction,
  paymentMethods, insertPaymentMethodSchema, type PaymentMethod, type InsertPaymentMethod,
  orders, insertOrderSchema, type Order, type InsertOrder,
  orderItems, insertOrderItemSchema, type OrderItem, type InsertOrderItem,
  orderStatusHistory, insertOrderStatusHistorySchema, type OrderStatusHistory, type InsertOrderStatusHistory,
  botCommands, insertBotCommandSchema, type BotCommand, type InsertBotCommand,
  vouches, insertVouchSchema, type Vouch, type InsertVouch,
  userInteractions, type UserInteraction, type InsertUserInteraction,
  gpRates, insertGpRateSchema, type GpRate, type InsertGpRate,
  rsnRegistrations, insertRsnRegistrationSchema, type RsnRegistration, type InsertRsnRegistration,
  botSettings, type BotSetting,
  sytheVouches, insertSytheVouchSchema, type SytheVouch, type InsertSytheVouch
} from '@shared/schema';

// Storage interface definition
export interface IStorage {
  // Service operations
  getServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  getServiceByName(name: string): Promise<Service | undefined>;
  createService(insertService: InsertService): Promise<Service>;
  updateService(id: string, updates: Partial<Service>): Promise<Service | undefined>;
  
  // Skill operations
  getSkills(): Promise<Skill[]>;
  getSkill(id: string): Promise<Skill | undefined>;
  getSkillByName(name: string): Promise<Skill | undefined>;
  createSkill(insertSkill: InsertSkill): Promise<Skill>;
  updateSkill(id: string, updates: Partial<Skill>): Promise<Skill | undefined>;
  
  // Training methods operations
  getTrainingMethods(): Promise<TrainingMethod[]>;
  getTrainingMethodsBySkill(skillId: string): Promise<TrainingMethod[]>;
  createTrainingMethod(insertMethod: InsertTrainingMethod): Promise<TrainingMethod>;
  updateTrainingMethod(id: string, updates: Partial<TrainingMethod>): Promise<TrainingMethod | undefined>;
  
  // Skill calculator operations
  getExperienceByLevel(level: number): Promise<number | undefined>;
  
  // Quest operations
  getQuests(): Promise<Quest[]>;
  getQuest(id: string): Promise<Quest | undefined>;
  getQuestByName(name: string): Promise<Quest | undefined>;
  createQuest(insertQuest: InsertQuest): Promise<Quest>;
  updateQuest(id: string, updates: Partial<Quest>): Promise<Quest | undefined>;
  deleteQuest(id: string): Promise<void>;

  // Special Offer operations
  getSpecialOffers(): Promise<SpecialOffer[]>;
  getActiveOffers(): Promise<SpecialOffer[]>;
  getSpecialOffer(id: string): Promise<SpecialOffer | undefined>;
  createSpecialOffer(insertOffer: InsertSpecialOffer): Promise<SpecialOffer>;
  updateSpecialOffer(id: string, updates: Partial<SpecialOffer>): Promise<SpecialOffer | undefined>;
  deleteSpecialOffer(id: string): Promise<void>;
  
  // Bot command operations
  getBotCommands(): Promise<BotCommand[]>;
  getBotCommand(commandName: string): Promise<BotCommand | undefined>;
  createBotCommand(insertCommand: InsertBotCommand): Promise<BotCommand>;
  updateCommandUsage(commandName: string): Promise<void>;
  
  // User interaction operations
  getUserInteractions(): Promise<UserInteraction[]>;
  createUserInteraction(insertInteraction: InsertUserInteraction): Promise<UserInteraction>;
  getUserInteractionsByService(serviceId: string): Promise<UserInteraction[]>;
  
  // User wallet operations
  getUser(userId: string): Promise<UserWallet | undefined>;
  searchUsers(query: string): Promise<UserWallet[]>;
  getUserWallet(userId: string): Promise<UserWallet | undefined>;
  getUserWalletsByUserId(userId: string): Promise<UserWallet[]>;
  getUserWalletByUsername(username: string): Promise<UserWallet | undefined>;
  getUserWalletByUsernameAndType(username: string, userType: 'customer' | 'worker'): Promise<UserWallet | undefined>;
  getUserWalletByUserIdAndType(userId: string, userType: 'customer' | 'worker'): Promise<UserWallet | undefined>;
  getUserWalletById(walletId: string): Promise<UserWallet | undefined>;
  getAllUserWalletsByUsername(username: string): Promise<UserWallet[]>;
  getAllUserWalletsById(userId: string): Promise<UserWallet[]>;
  createUserWallet(insertWallet: InsertUserWallet): Promise<UserWallet>;
  updateUserWallet(id: string, updates: Partial<UserWallet>): Promise<UserWallet | undefined>;
  
  // Wallet transaction operations
  getWalletTransactions(walletId: string): Promise<WalletTransaction[]>;
  getWalletTransaction(id: string): Promise<WalletTransaction | undefined>;
  createWalletTransaction(insertTransaction: InsertWalletTransaction): Promise<WalletTransaction>;
  updateWalletTransaction(id: string, updates: Partial<WalletTransaction>): Promise<WalletTransaction | undefined>;
  updateWalletBalance(walletId: string, balanceGp: number): Promise<UserWallet | undefined>;
  updateUserManualRank(userId: string, manualRank: string | null): Promise<UserWallet | undefined>;
  
  // Payment method operations
  getPaymentMethods(): Promise<PaymentMethod[]>;
  getActivePaymentMethods(): Promise<PaymentMethod[]>;
  getPaymentMethod(id: string): Promise<PaymentMethod | undefined>;
  createPaymentMethod(insertPaymentMethod: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<void>;
  
  // Order operations
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getOrdersByWorker(workerId: string): Promise<Order[]>;
  createOrder(insertOrder: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;
  
  // Order item operations
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  getOrderItem(id: string): Promise<OrderItem | undefined>;
  createOrderItem(insertOrderItem: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: string, updates: Partial<OrderItem>): Promise<OrderItem | undefined>;
  
  // Order status history operations
  getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]>;
  createOrderStatusHistory(insertHistory: InsertOrderStatusHistory): Promise<OrderStatusHistory>;
  
  // Deposit operations
  lockDeposit(walletId: string, depositAmount: number): Promise<UserWallet>;
  unlockDeposit(walletId: string, depositAmount: number): Promise<UserWallet>;
  deductOrderAmount(userId: string, orderAmount: number, orderNumber: string, description?: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }>;
  
  // Admin operations
  getWalletStats(): Promise<{
    totalWallets: number;
    totalBalance: string;
    totalDeposited: string;
    totalTransactions: number;
  }>;
  getAllUserWallets(): Promise<UserWallet[]>;
  getAllWalletTransactions(): Promise<WalletTransaction[]>;
  getRecentTransactions(): Promise<WalletTransaction[]>;
  adminDepositFunds(username: string, amountUsd: number, description: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }>;
  adminWithdrawFunds(username: string, amountUsd: number, description: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }>;
  adminRemoveGP(username: string, amountGp: number, description: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }>;
  adminSetWalletBalance(walletId: string, balanceUsd: string, balanceGp: number): Promise<UserWallet | undefined>;
  adminAdjustGPCredits(walletId: string, amount: number, operation: 'add' | 'remove', description: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }>;
  depositToWallet(userId: string, amountUsd: number, description?: string): Promise<UserWallet | undefined>;
  
  // Vouching operations
  getVouchesByUser(userId: string): Promise<Vouch[]>; // Get vouches received by user
  getVouchesByVoucher(voucherId: string): Promise<Vouch[]>; // Get vouches given by user
  createVouch(insertVouch: InsertVouch): Promise<Vouch>;
  updateVouch(id: string, updates: Partial<Vouch>): Promise<Vouch | undefined>;
  deleteVouch(id: string): Promise<void>;
  getVouchByOrderAndUser(orderNumber: string, userId: string): Promise<Vouch | undefined>;
  getVouchReputationStats(userId: string): Promise<{
    totalVouches: number;
    positiveVouches: number;
    negativeVouches: number;
    reputationScore: number;
    vouchesByType: Record<string, number>;
  }>;
  
  // GP Rates operations
  getGpRates(): Promise<GpRate[]>;
  getActiveGpRates(): Promise<GpRate[]>;
  getBuyingMethods(): Promise<GpRate[]>;
  getSellingMethods(): Promise<GpRate[]>;
  getGpRate(id: string): Promise<GpRate | undefined>;
  getGpRateByMethod(methodName: string): Promise<GpRate | undefined>;
  createGpRate(insertGpRate: InsertGpRate): Promise<GpRate>;
  updateGpRate(id: string, updates: Partial<GpRate>): Promise<GpRate | undefined>;
  deleteGpRate(id: string): Promise<void>;
  
  // RSN Registration operations (for Dink webhook routing)
  getRsnRegistration(rsn: string): Promise<RsnRegistration | undefined>;
  getRsnRegistrationByChannel(channelId: string): Promise<RsnRegistration | undefined>;
  getRsnRegistrationsByOrder(orderId: string): Promise<RsnRegistration[]>;
  getActiveRsnRegistrations(): Promise<RsnRegistration[]>;
  createRsnRegistration(insertRsn: InsertRsnRegistration): Promise<RsnRegistration>;
  updateRsnRegistration(id: string, updates: Partial<RsnRegistration>): Promise<RsnRegistration | undefined>;
  deactivateRsnRegistration(id: string): Promise<RsnRegistration | undefined>;
  deactivateRsnRegistrationsByOrder(orderId: string): Promise<void>;
  
  // Sythe Vouch operations (for forum scraping)
  getSytheVouch(postId: string): Promise<SytheVouch | undefined>;
  getUnpostedSytheVouches(): Promise<SytheVouch[]>;
  getAllSytheVouches(): Promise<SytheVouch[]>;
  createSytheVouch(insertVouch: InsertSytheVouch): Promise<SytheVouch>;
  markSytheVouchPosted(id: string, discordMessageId: string): Promise<SytheVouch | undefined>;
  
  // Helper methods
  generateOrderNumber(): Promise<string>;
  updateOrderStatus(orderId: string, newStatus: string, updatedBy: string, updatedByUsername: string, notes?: string): Promise<Order | undefined>;
  updateOrderItemStatus(itemId: string, newStatus: string, updatedBy: string, updatedByUsername: string, notes?: string): Promise<OrderItem | undefined>;
}

// In-Memory Storage Implementation (fallback)
export class MemStorage implements IStorage {
  // Service operations
  async getServices(): Promise<Service[]> {
    throw new Error("MemStorage does not support service operations. Use DatabaseStorage instead.");
  }

  async getService(id: string): Promise<Service | undefined> {
    throw new Error("MemStorage does not support service operations. Use DatabaseStorage instead.");
  }

  async getServiceByName(name: string): Promise<Service | undefined> {
    throw new Error("MemStorage does not support service operations. Use DatabaseStorage instead.");
  }

  async createService(insertService: InsertService): Promise<Service> {
    throw new Error("MemStorage does not support service operations. Use DatabaseStorage instead.");
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service | undefined> {
    throw new Error("MemStorage does not support service operations. Use DatabaseStorage instead.");
  }

  // Skill operations
  async getSkills(): Promise<Skill[]> {
    throw new Error("MemStorage does not support skill operations. Use DatabaseStorage instead.");
  }

  async getSkill(id: string): Promise<Skill | undefined> {
    throw new Error("MemStorage does not support skill operations. Use DatabaseStorage instead.");
  }

  async getSkillByName(name: string): Promise<Skill | undefined> {
    throw new Error("MemStorage does not support skill operations. Use DatabaseStorage instead.");
  }

  async createSkill(insertSkill: InsertSkill): Promise<Skill> {
    throw new Error("MemStorage does not support skill operations. Use DatabaseStorage instead.");
  }

  async updateSkill(id: string, updates: Partial<Skill>): Promise<Skill | undefined> {
    throw new Error("MemStorage does not support skill operations. Use DatabaseStorage instead.");
  }

  // Training methods operations
  async getTrainingMethods(): Promise<TrainingMethod[]> {
    throw new Error("MemStorage does not support training methods operations. Use DatabaseStorage instead.");
  }

  async getTrainingMethodsBySkill(skillId: string): Promise<TrainingMethod[]> {
    throw new Error("MemStorage does not support training methods operations. Use DatabaseStorage instead.");
  }

  async createTrainingMethod(insertMethod: InsertTrainingMethod): Promise<TrainingMethod> {
    throw new Error("MemStorage does not support training methods operations. Use DatabaseStorage instead.");
  }

  async updateTrainingMethod(id: string, updates: Partial<TrainingMethod>): Promise<TrainingMethod | undefined> {
    throw new Error("MemStorage does not support training methods operations. Use DatabaseStorage instead.");
  }

  // Skill calculator operations
  async getExperienceByLevel(level: number): Promise<number | undefined> {
    throw new Error("MemStorage does not support skill calculator operations. Use DatabaseStorage instead.");
  }

  // Quest operations
  async getQuests(): Promise<Quest[]> {
    throw new Error("MemStorage does not support quest operations. Use DatabaseStorage instead.");
  }

  async getQuest(id: string): Promise<Quest | undefined> {
    throw new Error("MemStorage does not support quest operations. Use DatabaseStorage instead.");
  }

  async getQuestByName(name: string): Promise<Quest | undefined> {
    throw new Error("MemStorage does not support quest operations. Use DatabaseStorage instead.");
  }

  async createQuest(insertQuest: InsertQuest): Promise<Quest> {
    throw new Error("MemStorage does not support quest operations. Use DatabaseStorage instead.");
  }

  async updateQuest(id: string, updates: Partial<Quest>): Promise<Quest | undefined> {
    throw new Error("MemStorage does not support quest operations. Use DatabaseStorage instead.");
  }

  async deleteQuest(id: string): Promise<void> {
    throw new Error("MemStorage does not support quest operations. Use DatabaseStorage instead.");
  }

  // Special Offer operations
  async getSpecialOffers(): Promise<SpecialOffer[]> {
    throw new Error("MemStorage does not support special offer operations. Use DatabaseStorage instead.");
  }

  async getActiveOffers(): Promise<SpecialOffer[]> {
    throw new Error("MemStorage does not support special offer operations. Use DatabaseStorage instead.");
  }

  async getSpecialOffer(id: string): Promise<SpecialOffer | undefined> {
    throw new Error("MemStorage does not support special offer operations. Use DatabaseStorage instead.");
  }

  async createSpecialOffer(insertOffer: InsertSpecialOffer): Promise<SpecialOffer> {
    throw new Error("MemStorage does not support special offer operations. Use DatabaseStorage instead.");
  }

  async updateSpecialOffer(id: string, updates: Partial<SpecialOffer>): Promise<SpecialOffer | undefined> {
    throw new Error("MemStorage does not support special offer operations. Use DatabaseStorage instead.");
  }

  async deleteSpecialOffer(id: string): Promise<void> {
    throw new Error("MemStorage does not support special offer operations. Use DatabaseStorage instead.");
  }

  // Bot command operations
  async getBotCommands(): Promise<BotCommand[]> {
    throw new Error("MemStorage does not support bot command operations. Use DatabaseStorage instead.");
  }

  async getBotCommand(commandName: string): Promise<BotCommand | undefined> {
    throw new Error("MemStorage does not support bot command operations. Use DatabaseStorage instead.");
  }

  async createBotCommand(insertCommand: InsertBotCommand): Promise<BotCommand> {
    throw new Error("MemStorage does not support bot command operations. Use DatabaseStorage instead.");
  }

  async updateCommandUsage(commandName: string): Promise<void> {
    throw new Error("MemStorage does not support bot command operations. Use DatabaseStorage instead.");
  }

  // User interaction operations
  async getUserInteractions(): Promise<UserInteraction[]> {
    throw new Error("MemStorage does not support user interaction operations. Use DatabaseStorage instead.");
  }

  async createUserInteraction(insertInteraction: InsertUserInteraction): Promise<UserInteraction> {
    throw new Error("MemStorage does not support user interaction operations. Use DatabaseStorage instead.");
  }

  async getUserInteractionsByService(serviceId: string): Promise<UserInteraction[]> {
    throw new Error("MemStorage does not support user interaction operations. Use DatabaseStorage instead.");
  }

  // User wallet operations
  async getUser(userId: string): Promise<UserWallet | undefined> {
    throw new Error("MemStorage does not support user operations. Use DatabaseStorage instead.");
  }

  async searchUsers(query: string): Promise<UserWallet[]> {
    throw new Error("MemStorage does not support user operations. Use DatabaseStorage instead.");
  }

  async getUserWallet(userId: string): Promise<UserWallet | undefined> {
    throw new Error("MemStorage does not support user wallet operations. Use DatabaseStorage instead.");
  }

  async getUserWalletsByUserId(userId: string): Promise<UserWallet[]> {
    throw new Error("MemStorage does not support user wallet operations. Use DatabaseStorage instead.");
  }

  async getUserWalletByUsername(username: string): Promise<UserWallet | undefined> {
    throw new Error("MemStorage does not support user wallet operations. Use DatabaseStorage instead.");
  }

  async getUserWalletById(walletId: string): Promise<UserWallet | undefined> {
    throw new Error("MemStorage does not support user wallet operations. Use DatabaseStorage instead.");
  }

  async getUserWalletByUsernameAndType(username: string, userType: 'customer' | 'worker'): Promise<UserWallet | undefined> {
    throw new Error("MemStorage does not support user wallet operations. Use DatabaseStorage instead.");
  }

  async getUserWalletByUserIdAndType(userId: string, userType: 'customer' | 'worker'): Promise<UserWallet | undefined> {
    throw new Error("MemStorage does not support user wallet operations. Use DatabaseStorage instead.");
  }

  async getAllUserWalletsByUsername(username: string): Promise<UserWallet[]> {
    throw new Error("MemStorage does not support user wallet operations. Use DatabaseStorage instead.");
  }

  async getAllUserWalletsById(userId: string): Promise<UserWallet[]> {
    throw new Error("MemStorage does not support user wallet operations. Use DatabaseStorage instead.");
  }

  async createUserWallet(insertWallet: InsertUserWallet): Promise<UserWallet> {
    throw new Error("MemStorage does not support user wallet operations. Use DatabaseStorage instead.");
  }

  async updateUserWallet(id: string, updates: Partial<UserWallet>): Promise<UserWallet | undefined> {
    throw new Error("MemStorage does not support user wallet operations. Use DatabaseStorage instead.");
  }

  // Wallet transaction operations
  async getWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
    throw new Error("MemStorage does not support wallet transaction operations. Use DatabaseStorage instead.");
  }

  async getWalletTransaction(id: string): Promise<WalletTransaction | undefined> {
    throw new Error("MemStorage does not support wallet transaction operations. Use DatabaseStorage instead.");
  }

  async createWalletTransaction(insertTransaction: InsertWalletTransaction): Promise<WalletTransaction> {
    throw new Error("MemStorage does not support wallet transaction operations. Use DatabaseStorage instead.");
  }

  async updateWalletTransaction(id: string, updates: Partial<WalletTransaction>): Promise<WalletTransaction | undefined> {
    throw new Error("MemStorage does not support wallet transaction operations. Use DatabaseStorage instead.");
  }

  async updateWalletBalance(walletId: string, balanceGp: number): Promise<UserWallet | undefined> {
    throw new Error("MemStorage does not support wallet balance operations. Use DatabaseStorage instead.");
  }

  async updateUserManualRank(userId: string, manualRank: string | null): Promise<UserWallet | undefined> {
    throw new Error("MemStorage does not support user rank operations. Use DatabaseStorage instead.");
  }

  // Payment method operations
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    throw new Error("MemStorage does not support payment method operations. Use DatabaseStorage instead.");
  }

  async getActivePaymentMethods(): Promise<PaymentMethod[]> {
    throw new Error("MemStorage does not support payment method operations. Use DatabaseStorage instead.");
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    throw new Error("MemStorage does not support payment method operations. Use DatabaseStorage instead.");
  }

  async createPaymentMethod(insertPaymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    throw new Error("MemStorage does not support payment method operations. Use DatabaseStorage instead.");
  }

  async updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    throw new Error("MemStorage does not support payment method operations. Use DatabaseStorage instead.");
  }

  async deletePaymentMethod(id: string): Promise<void> {
    throw new Error("MemStorage does not support payment method operations. Use DatabaseStorage instead.");
  }

  // Order operations
  async getOrders(): Promise<Order[]> {
    throw new Error("MemStorage does not support order operations. Use DatabaseStorage instead.");
  }

  async getOrder(id: string): Promise<Order | undefined> {
    throw new Error("MemStorage does not support order operations. Use DatabaseStorage instead.");
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    throw new Error("MemStorage does not support order operations. Use DatabaseStorage instead.");
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    throw new Error("MemStorage does not support order operations. Use DatabaseStorage instead.");
  }

  async getOrdersByWorker(workerId: string): Promise<Order[]> {
    throw new Error("MemStorage does not support order operations. Use DatabaseStorage instead.");
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    throw new Error("MemStorage does not support order operations. Use DatabaseStorage instead.");
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    throw new Error("MemStorage does not support order operations. Use DatabaseStorage instead.");
  }

  // Order item operations
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    throw new Error("MemStorage does not support order item operations. Use DatabaseStorage instead.");
  }

  async getOrderItem(id: string): Promise<OrderItem | undefined> {
    throw new Error("MemStorage does not support order item operations. Use DatabaseStorage instead.");
  }

  async createOrderItem(insertOrderItem: InsertOrderItem): Promise<OrderItem> {
    throw new Error("MemStorage does not support order item operations. Use DatabaseStorage instead.");
  }

  async updateOrderItem(id: string, updates: Partial<OrderItem>): Promise<OrderItem | undefined> {
    throw new Error("MemStorage does not support order item operations. Use DatabaseStorage instead.");
  }

  // Order status history operations
  async getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    throw new Error("MemStorage does not support order status history operations. Use DatabaseStorage instead.");
  }

  async createOrderStatusHistory(insertHistory: InsertOrderStatusHistory): Promise<OrderStatusHistory> {
    throw new Error("MemStorage does not support order status history operations. Use DatabaseStorage instead.");
  }

  // Deposit operations
  async lockDeposit(walletId: string, depositAmount: number): Promise<UserWallet> {
    throw new Error("MemStorage does not support deposit operations. Use DatabaseStorage instead.");
  }

  async unlockDeposit(walletId: string, depositAmount: number): Promise<UserWallet> {
    throw new Error("MemStorage does not support deposit operations. Use DatabaseStorage instead.");
  }

  async deductOrderAmount(userId: string, orderAmount: number, orderNumber: string, description?: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }> {
    throw new Error("MemStorage does not support wallet deduction operations. Use DatabaseStorage instead.");
  }

  // Admin operations
  async getWalletStats(): Promise<{
    totalWallets: number;
    totalBalance: string;
    totalDeposited: string;
    totalTransactions: number;
  }> {
    throw new Error("MemStorage does not support admin wallet management. Use DatabaseStorage instead.");
  }

  async getAllUserWallets(): Promise<UserWallet[]> {
    throw new Error("MemStorage does not support admin wallet management. Use DatabaseStorage instead.");
  }

  async getRecentTransactions(): Promise<WalletTransaction[]> {
    throw new Error("MemStorage does not support admin wallet management. Use DatabaseStorage instead.");
  }

  async getAllWalletTransactions(): Promise<WalletTransaction[]> {
    throw new Error("MemStorage does not support admin wallet management. Use DatabaseStorage instead.");
  }

  async adminDepositFunds(username: string, amountUsd: number, description: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }> {
    throw new Error("MemStorage does not support admin wallet management. Use DatabaseStorage instead.");
  }

  async adminWithdrawFunds(username: string, amountUsd: number, description: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }> {
    throw new Error("MemStorage does not support admin wallet management. Use DatabaseStorage instead.");
  }

  async adminRemoveGP(username: string, amountGp: number, description: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }> {
    throw new Error("MemStorage does not support admin wallet management. Use DatabaseStorage instead.");
  }

  async adminSetWalletBalance(walletId: string, balanceUsd: string, balanceGp: number): Promise<UserWallet | undefined> {
    throw new Error("MemStorage does not support admin wallet management. Use DatabaseStorage instead.");
  }

  async adminAdjustGPCredits(walletId: string, amount: number, operation: 'add' | 'remove', description: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }> {
    throw new Error("MemStorage does not support admin wallet management. Use DatabaseStorage instead.");
  }

  async depositToWallet(userId: string, amountUsd: number, description?: string): Promise<UserWallet | undefined> {
    throw new Error("MemStorage does not support wallet operations. Use DatabaseStorage instead.");
  }

  // Vouching operations
  async getVouchesByUser(userId: string): Promise<Vouch[]> {
    throw new Error("MemStorage does not support vouching operations. Use DatabaseStorage instead.");
  }

  async getVouchesByVoucher(voucherId: string): Promise<Vouch[]> {
    throw new Error("MemStorage does not support vouching operations. Use DatabaseStorage instead.");
  }

  async createVouch(insertVouch: InsertVouch): Promise<Vouch> {
    throw new Error("MemStorage does not support vouching operations. Use DatabaseStorage instead.");
  }

  async updateVouch(id: string, updates: Partial<Vouch>): Promise<Vouch | undefined> {
    throw new Error("MemStorage does not support vouching operations. Use DatabaseStorage instead.");
  }

  async deleteVouch(id: string): Promise<void> {
    throw new Error("MemStorage does not support vouching operations. Use DatabaseStorage instead.");
  }

  async getVouchByOrderAndUser(orderNumber: string, userId: string): Promise<Vouch | undefined> {
    throw new Error("MemStorage does not support vouching operations. Use DatabaseStorage instead.");
  }

  async getVouchReputationStats(userId: string): Promise<{
    totalVouches: number;
    positiveVouches: number;
    negativeVouches: number;
    reputationScore: number;
    vouchesByType: Record<string, number>;
  }> {
    throw new Error("MemStorage does not support vouching operations. Use DatabaseStorage instead.");
  }

  async generateOrderNumber(): Promise<string> {
    throw new Error("MemStorage does not support order operations. Use DatabaseStorage instead.");
  }

  async updateOrderStatus(orderId: string, newStatus: string, updatedBy: string, updatedByUsername: string, notes?: string): Promise<Order | undefined> {
    throw new Error("MemStorage does not support order status updates. Use DatabaseStorage instead.");
  }

  async updateOrderItemStatus(itemId: string, newStatus: string, updatedBy: string, updatedByUsername: string, notes?: string): Promise<OrderItem | undefined> {
    throw new Error("MemStorage does not support order item status updates. Use DatabaseStorage instead.");
  }

  // GP Rates operations
  async getGpRates(): Promise<GpRate[]> {
    throw new Error("MemStorage does not support GP rates operations. Use DatabaseStorage instead.");
  }

  async getActiveGpRates(): Promise<GpRate[]> {
    throw new Error("MemStorage does not support GP rates operations. Use DatabaseStorage instead.");
  }

  async getBuyingMethods(): Promise<GpRate[]> {
    throw new Error("MemStorage does not support GP rates operations. Use DatabaseStorage instead.");
  }

  async getSellingMethods(): Promise<GpRate[]> {
    throw new Error("MemStorage does not support GP rates operations. Use DatabaseStorage instead.");
  }

  async getGpRate(id: string): Promise<GpRate | undefined> {
    throw new Error("MemStorage does not support GP rates operations. Use DatabaseStorage instead.");
  }

  async getGpRateByMethod(methodName: string): Promise<GpRate | undefined> {
    throw new Error("MemStorage does not support GP rates operations. Use DatabaseStorage instead.");
  }

  async createGpRate(insertGpRate: InsertGpRate): Promise<GpRate> {
    throw new Error("MemStorage does not support GP rates operations. Use DatabaseStorage instead.");
  }

  async updateGpRate(id: string, updates: Partial<GpRate>): Promise<GpRate | undefined> {
    throw new Error("MemStorage does not support GP rates operations. Use DatabaseStorage instead.");
  }

  async deleteGpRate(id: string): Promise<void> {
    throw new Error("MemStorage does not support GP rates operations. Use DatabaseStorage instead.");
  }

  // RSN Registration operations
  async getRsnRegistration(rsn: string): Promise<RsnRegistration | undefined> {
    throw new Error("MemStorage does not support RSN registration operations. Use DatabaseStorage instead.");
  }

  async getRsnRegistrationByChannel(channelId: string): Promise<RsnRegistration | undefined> {
    throw new Error("MemStorage does not support RSN registration operations. Use DatabaseStorage instead.");
  }

  async getRsnRegistrationsByOrder(orderId: string): Promise<RsnRegistration[]> {
    throw new Error("MemStorage does not support RSN registration operations. Use DatabaseStorage instead.");
  }

  async getActiveRsnRegistrations(): Promise<RsnRegistration[]> {
    throw new Error("MemStorage does not support RSN registration operations. Use DatabaseStorage instead.");
  }

  async createRsnRegistration(insertRsn: InsertRsnRegistration): Promise<RsnRegistration> {
    throw new Error("MemStorage does not support RSN registration operations. Use DatabaseStorage instead.");
  }

  async updateRsnRegistration(id: string, updates: Partial<RsnRegistration>): Promise<RsnRegistration | undefined> {
    throw new Error("MemStorage does not support RSN registration operations. Use DatabaseStorage instead.");
  }

  async deactivateRsnRegistration(id: string): Promise<RsnRegistration | undefined> {
    throw new Error("MemStorage does not support RSN registration operations. Use DatabaseStorage instead.");
  }

  async deactivateRsnRegistrationsByOrder(orderId: string): Promise<void> {
    throw new Error("MemStorage does not support RSN registration operations. Use DatabaseStorage instead.");
  }

  // Sythe Vouch operations
  async getSytheVouch(postId: string): Promise<SytheVouch | undefined> {
    throw new Error("MemStorage does not support Sythe vouch operations. Use DatabaseStorage instead.");
  }

  async getUnpostedSytheVouches(): Promise<SytheVouch[]> {
    throw new Error("MemStorage does not support Sythe vouch operations. Use DatabaseStorage instead.");
  }

  async getAllSytheVouches(): Promise<SytheVouch[]> {
    throw new Error("MemStorage does not support Sythe vouch operations. Use DatabaseStorage instead.");
  }

  async createSytheVouch(insertVouch: InsertSytheVouch): Promise<SytheVouch> {
    throw new Error("MemStorage does not support Sythe vouch operations. Use DatabaseStorage instead.");
  }

  async markSytheVouchPosted(id: string, discordMessageId: string): Promise<SytheVouch | undefined> {
    throw new Error("MemStorage does not support Sythe vouch operations. Use DatabaseStorage instead.");
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getServices(): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.isActive, true));
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getServiceByName(name: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.name, name));
    return service || undefined;
  }

  async createService(insertService: InsertService): Promise<Service> {
    const [service] = await db
      .insert(services)
      .values(insertService)
      .returning();
    return service;
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service | undefined> {
    const [service] = await db
      .update(services)
      .set(updates)
      .where(eq(services.id, id))
      .returning();
    return service || undefined;
  }

  async getBotCommands(): Promise<BotCommand[]> {
    return await db.select().from(botCommands);
  }

  async getBotCommand(commandName: string): Promise<BotCommand | undefined> {
    const [command] = await db.select().from(botCommands).where(eq(botCommands.commandName, commandName));
    return command || undefined;
  }

  async createBotCommand(insertCommand: InsertBotCommand): Promise<BotCommand> {
    const [command] = await db
      .insert(botCommands)
      .values(insertCommand)
      .returning();
    return command;
  }

  async updateCommandUsage(commandName: string): Promise<void> {
    try {
      const existingCommand = await this.getBotCommand(commandName);
      
      if (existingCommand) {
        // Update usage count and last used timestamp
        await db
          .update(botCommands)
          .set({
            usageCount: (parseInt(existingCommand.usageCount) + 1).toString(),
            lastUsed: new Date()
          })
          .where(eq(botCommands.commandName, commandName));
      } else {
        // Create new command entry
        await this.createBotCommand({
          commandName: commandName,
          usageCount: "1",
          lastUsed: new Date(),
          isEnabled: true,
          description: `${commandName} command`
        });
      }
    } catch (error) {
      console.error(`Failed to update command usage for ${commandName}:`, error);
    }
  }

  // User interaction operations
  async getUserInteractions(): Promise<UserInteraction[]> {
    return await db.select().from(userInteractions).orderBy(desc(userInteractions.timestamp));
  }

  async createUserInteraction(insertInteraction: InsertUserInteraction): Promise<UserInteraction> {
    const [interaction] = await db
      .insert(userInteractions)
      .values(insertInteraction)
      .returning();
    return interaction;
  }

  async getUserInteractionsByService(serviceId: string): Promise<UserInteraction[]> {
    return await db
      .select()
      .from(userInteractions)
      .where(eq(userInteractions.serviceId, serviceId))
      .orderBy(desc(userInteractions.timestamp));
  }

  // Skill operations
  async getSkills(): Promise<Skill[]> {
    return await db.select().from(skills).where(eq(skills.isActive, true));
  }

  async getSkill(id: string): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.id, id));
    return skill || undefined;
  }

  async getSkillByName(name: string): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.name, name));
    return skill || undefined;
  }

  async createSkill(insertSkill: InsertSkill): Promise<Skill> {
    const [skill] = await db
      .insert(skills)
      .values(insertSkill)
      .returning();
    return skill;
  }

  async updateSkill(id: string, updates: Partial<Skill>): Promise<Skill | undefined> {
    const [skill] = await db
      .update(skills)
      .set(updates)
      .where(eq(skills.id, id))
      .returning();
    return skill || undefined;
  }

  // Training methods operations
  async getTrainingMethods(): Promise<TrainingMethod[]> {
    return await db.select().from(trainingMethods).where(eq(trainingMethods.isActive, true)).orderBy(asc(trainingMethods.sortOrder));
  }

  async createTrainingMethod(data: InsertTrainingMethod): Promise<TrainingMethod> {
    const [method] = await db
      .insert(trainingMethods)
      .values(data)
      .returning();
    return method;
  }

  async updateTrainingMethod(id: string, updates: Partial<TrainingMethod>): Promise<TrainingMethod | undefined> {
    const [method] = await db
      .update(trainingMethods)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(trainingMethods.id, id))
      .returning();
    return method || undefined;
  }

  async deleteTrainingMethod(id: string): Promise<void> {
    await db.delete(trainingMethods).where(eq(trainingMethods.id, id));
  }

  // Skill calculator methods
  async getTrainingMethodsBySkill(skillId: string): Promise<TrainingMethod[]> {
    return await db
      .select()
      .from(trainingMethods)
      .where(and(eq(trainingMethods.skillId, skillId), eq(trainingMethods.isActive, true)))
      .orderBy(asc(trainingMethods.sortOrder));
  }

  async getExperienceByLevel(level: number): Promise<number | undefined> {
    // Validate level bounds first
    if (level < 1 || level > 200) {
      console.log(`Invalid level requested: ${level}. Must be between 1-200.`);
      return undefined;
    }

    // Calculate experience using OSRS formula for any level
    let experience = 0;
    for (let i = 1; i < level; i++) {
      experience += Math.floor(i + 300 * Math.pow(2, i / 7.0)) / 4;
    }
    experience = Math.floor(experience);

    console.log(`Level ${level} requires ${experience} experience`);
    return experience;
  }

  // Quest operations
  async getQuests(): Promise<Quest[]> {
    return await db.select().from(quests).where(eq(quests.isActive, true));
  }

  async getQuest(id: string): Promise<Quest | undefined> {
    const [quest] = await db.select().from(quests).where(eq(quests.id, id));
    return quest || undefined;
  }

  async getQuestByName(name: string): Promise<Quest | undefined> {
    const [quest] = await db.select().from(quests).where(eq(quests.name, name));
    return quest || undefined;
  }

  async createQuest(insertQuest: InsertQuest): Promise<Quest> {
    const [quest] = await db
      .insert(quests)
      .values(insertQuest)
      .returning();
    return quest;
  }

  async updateQuest(id: string, updates: Partial<Quest>): Promise<Quest | undefined> {
    const [quest] = await db
      .update(quests)
      .set(updates)
      .where(eq(quests.id, id))
      .returning();
    return quest || undefined;
  }

  async deleteQuest(id: string): Promise<void> {
    await db.delete(quests).where(eq(quests.id, id));
  }

  // Quest pricing operations
  async getQuestPricing(): Promise<QuestPricing[]> {
    return await db.select().from(questPricing).where(eq(questPricing.isActive, true));
  }

  async getQuestPricingByQuest(questId: string): Promise<QuestPricing[]> {
    return await db
      .select()
      .from(questPricing)
      .where(and(eq(questPricing.questId, questId), eq(questPricing.isActive, true)));
  }

  async createQuestPricing(data: InsertQuestPricing): Promise<QuestPricing> {
    const [pricing] = await db
      .insert(questPricing)
      .values(data)
      .returning();
    return pricing;
  }

  async updateQuestPricing(id: string, updates: Partial<QuestPricing>): Promise<QuestPricing | undefined> {
    const [pricing] = await db
      .update(questPricing)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(questPricing.id, id))
      .returning();
    return pricing || undefined;
  }

  async deleteQuestPricing(id: string): Promise<void> {
    await db.delete(questPricing).where(eq(questPricing.id, id));
  }

  // Special Offer operations
  async getSpecialOffers(): Promise<SpecialOffer[]> {
    return await db.select().from(specialOffers);
  }

  async getActiveOffers(): Promise<SpecialOffer[]> {
    const now = new Date();
    return await db
      .select()
      .from(specialOffers)
      .where(
        and(
          eq(specialOffers.isActive, true),
          or(
            sql`${specialOffers.expiresAt} IS NULL`,
            sql`${specialOffers.expiresAt} > ${now}`
          )
        )
      );
  }

  async getSpecialOffer(id: string): Promise<SpecialOffer | undefined> {
    const [offer] = await db.select().from(specialOffers).where(eq(specialOffers.id, id));
    return offer || undefined;
  }

  async createSpecialOffer(insertOffer: InsertSpecialOffer): Promise<SpecialOffer> {
    const [offer] = await db
      .insert(specialOffers)
      .values(insertOffer)
      .returning();
    return offer;
  }

  async updateSpecialOffer(id: string, updates: Partial<SpecialOffer>): Promise<SpecialOffer | undefined> {
    const [offer] = await db
      .update(specialOffers)
      .set(updates)
      .where(eq(specialOffers.id, id))
      .returning();
    return offer || undefined;
  }

  async deleteSpecialOffer(id: string): Promise<void> {
    await db.delete(specialOffers).where(eq(specialOffers.id, id));
  }

  // User Wallets methods
  async getUser(userId: string): Promise<UserWallet | undefined> {
    const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, userId));
    return wallet || undefined;
  }

  async searchUsers(query: string): Promise<UserWallet[]> {
    return await db
      .select()
      .from(userWallets)
      .where(or(
        sql`${userWallets.username} ILIKE ${`%${query}%`}`,
        sql`${userWallets.userId} ILIKE ${`%${query}%`}`
      ))
      .limit(50);
  }

  async getUserWallet(userId: string): Promise<UserWallet | undefined> {
    try {
      // Try new schema first
      const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, userId));
      return wallet || undefined;
    } catch (error) {
      console.error('Error fetching wallet:', error);
      return undefined;
    }
  }

  async getUserWalletByUsername(username: string): Promise<UserWallet | undefined> {
    const [wallet] = await db.select().from(userWallets).where(eq(userWallets.username, username));
    return wallet || undefined;
  }

  // Get ALL wallets for a userId (used for refunds - user might have customer or worker wallet)
  async getUserWalletsByUserId(userId: string): Promise<UserWallet[]> {
    return await db.select().from(userWallets).where(eq(userWallets.userId, userId));
  }

  // Get wallet by username and specific user type (customer/worker)
  async getUserWalletByUsernameAndType(username: string, userType: 'customer' | 'worker'): Promise<UserWallet | undefined> {
    const [wallet] = await db.select().from(userWallets).where(
      and(eq(userWallets.username, username), eq(userWallets.userType, userType))
    );
    return wallet || undefined;
  }

  // Get wallet by Discord userId and specific user type (PRIMARY LOOKUP METHOD)
  async getUserWalletByUserIdAndType(userId: string, userType: 'customer' | 'worker'): Promise<UserWallet | undefined> {
    const [wallet] = await db.select().from(userWallets).where(
      and(eq(userWallets.userId, userId), eq(userWallets.userType, userType))
    );
    return wallet || undefined;
  }

  // Get all wallets for a username (both customer and worker if they exist)
  async getAllUserWalletsByUsername(username: string): Promise<UserWallet[]> {
    return await db.select().from(userWallets).where(eq(userWallets.username, username));
  }

  // Get all wallets for a Discord userId (both customer and worker if they exist)
  async getAllUserWalletsById(userId: string): Promise<UserWallet[]> {
    return await db.select().from(userWallets).where(eq(userWallets.userId, userId));
  }

  // Smart wallet lookup - prioritizes worker for deposit-related operations, otherwise gets the first one
  async getSmartUserWallet(username: string, preferWorker = false): Promise<UserWallet | undefined> {
    const allWallets = await this.getAllUserWalletsByUsername(username);
    
    if (allWallets.length === 0) {
      return undefined;
    }
    
    if (allWallets.length === 1) {
      return allWallets[0];
    }
    
    // If multiple wallets exist, prioritize based on context
    if (preferWorker) {
      return allWallets.find(w => w.userType === 'worker') || allWallets[0];
    }
    
    // Default: return customer first, then worker
    return allWallets.find(w => w.userType === 'customer') || allWallets[0];
  }

  async getUserWalletById(walletId: string): Promise<UserWallet | undefined> {
    const [wallet] = await db.select().from(userWallets).where(eq(userWallets.id, walletId));
    return wallet || undefined;
  }

  async createUserWallet(insertWallet: InsertUserWallet): Promise<UserWallet> {
    const [wallet] = await db
      .insert(userWallets)
      .values({
        ...insertWallet,
        userType: insertWallet.userType || 'customer',
        totalEarningsGp: insertWallet.totalEarningsGp || 0,
        completedJobs: insertWallet.completedJobs || 0,
        totalOrders: insertWallet.totalOrders || 0,
        customerRank: insertWallet.customerRank || '0.00'
      })
      .returning();
    return wallet;
  }

  async updateUserWallet(id: string, updates: Partial<UserWallet>): Promise<UserWallet | undefined> {
    const [wallet] = await db
      .update(userWallets)
      .set(updates)
      .where(eq(userWallets.id, id))
      .returning();
    return wallet || undefined;
  }

  // Wallet transaction methods
  async getWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
    return await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletId))
      .orderBy(desc(walletTransactions.createdAt));
  }

  async createWalletTransaction(insertTransaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const [transaction] = await db
      .insert(walletTransactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getWalletTransaction(id: string): Promise<WalletTransaction | undefined> {
    const [transaction] = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.id, id));
    return transaction || undefined;
  }

  async updateWalletTransaction(id: string, updates: Partial<WalletTransaction>): Promise<WalletTransaction | undefined> {
    const [transaction] = await db
      .update(walletTransactions)
      .set(updates)
      .where(eq(walletTransactions.id, id))
      .returning();
    return transaction || undefined;
  }

  async updateWalletBalance(walletId: string, balanceGp: number): Promise<UserWallet | undefined> {
    const [wallet] = await db
      .update(userWallets)
      .set({ balanceGp })
      .where(eq(userWallets.id, walletId))
      .returning();
    return wallet || undefined;
  }

  async updateUserManualRank(userId: string, manualRank: string | null): Promise<UserWallet | undefined> {
    const [wallet] = await db
      .update(userWallets)
      .set({ manualRank })
      .where(eq(userWallets.userId, userId))
      .returning();
    return wallet || undefined;
  }

  // Payment method operations
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return await db.select().from(paymentMethods).orderBy(paymentMethods.sortOrder);
  }

  async getActivePaymentMethods(): Promise<PaymentMethod[]> {
    return await db.select().from(paymentMethods).where(eq(paymentMethods.isActive, true)).orderBy(paymentMethods.sortOrder);
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    const [method] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
    return method || undefined;
  }

  async createPaymentMethod(insertPaymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const [method] = await db
      .insert(paymentMethods)
      .values(insertPaymentMethod)
      .returning();
    return method;
  }

  async updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const [method] = await db
      .update(paymentMethods)
      .set(updates)
      .where(eq(paymentMethods.id, id))
      .returning();
    return method || undefined;
  }

  async deletePaymentMethod(id: string): Promise<void> {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }

  // Lock deposit for active order - ONLY affects deposit, NOT real balance
  async lockDeposit(walletId: string, depositAmount: number): Promise<UserWallet> {
    const [wallet] = await db
      .update(userWallets)
      .set({ 
        // DO NOT TOUCH balanceGp (real money) - only lock the deposit!
        workingDepositGp: sql`${userWallets.workingDepositGp} + ${depositAmount}`,
        updatedAt: new Date()
      })
      .where(eq(userWallets.id, walletId))
      .returning();
    
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    console.log(`🔒 Locked deposit: ${depositAmount} GP for wallet ${walletId} (balanceGp unchanged: ${wallet.balanceGp} GP)`);
    return wallet;
  }

  // Unlock deposit when order is completed - ONLY affects deposit, NOT real balance
  async unlockDeposit(walletId: string, depositAmount: number): Promise<UserWallet> {
    const [wallet] = await db
      .update(userWallets)
      .set({ 
        // DO NOT TOUCH balanceGp (real money) - only unlock the deposit!
        workingDepositGp: sql`${userWallets.workingDepositGp} - ${depositAmount}`,
        updatedAt: new Date()
      })
      .where(eq(userWallets.id, walletId))
      .returning();
    
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    console.log(`🔓 Unlocked deposit: ${depositAmount} GP for wallet ${walletId} (balanceGp unchanged: ${wallet.balanceGp} GP)`);
    return wallet;
  }

  // Deduct order amount from customer wallet when order is created
  async deductOrderAmount(userId: string, orderAmount: number, orderNumber: string, description?: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }> {
    // Get customer wallet
    const wallet = await this.getUserWallet(userId);
    
    if (!wallet) {
      throw new Error('Customer wallet not found');
    }
    
    // Check if customer has sufficient balance
    if (wallet.balanceGp < orderAmount) {
      throw new Error(`Insufficient balance. Customer has ${wallet.balanceGp} GP but order requires ${orderAmount} GP`);
    }
    
    // Deduct from balance and add to totalSpent
    const [updatedWallet] = await db
      .update(userWallets)
      .set({ 
        balanceGp: sql`${userWallets.balanceGp} - ${orderAmount}`,
        totalSpentGp: sql`${userWallets.totalSpentGp} + ${orderAmount}`,
        updatedAt: new Date()
      })
      .where(eq(userWallets.userId, userId))
      .returning();
    
    if (!updatedWallet) {
      throw new Error('Failed to deduct order amount from wallet');
    }
    
    // Create transaction record
    const transaction = await this.createWalletTransaction({
      walletId: updatedWallet.id,
      userId: userId,
      type: 'debit',
      amount: '0',
      currency: 'GP',
      amountGp: orderAmount,
      description: description || `Order payment deducted for ${orderNumber}`,
      status: 'completed',
      referenceId: orderNumber
    });
    
    return {
      wallet: updatedWallet,
      transaction
    };
  }

  // Admin Wallet Management methods
  async getWalletStats(): Promise<{
    totalWallets: number;
    totalBalance: string;
    totalDeposited: string;
    totalTransactions: number;
  }> {
    // Get total wallets
    const walletCount = await db.select({count: sql<number>`count(*)`}).from(userWallets);
    const totalWallets = walletCount[0]?.count || 0;

    // Get total balance (sum of all wallet balances in GP)
    const balanceSum = await db.select({total: sql<string>`sum(${userWallets.balanceGp})`}).from(userWallets);
    const totalBalance = balanceSum[0]?.total || '0';

    // Get total deposited (sum of all totalDepositedGp)
    const depositedSum = await db.select({total: sql<string>`sum(${userWallets.totalDepositedGp})`}).from(userWallets);
    const totalDeposited = depositedSum[0]?.total || '0';

    // Get total transactions
    const transactionCount = await db.select({count: sql<number>`count(*)`}).from(walletTransactions);
    const totalTransactions = transactionCount[0]?.count || 0;

    return {
      totalWallets,
      totalBalance,
      totalDeposited,
      totalTransactions
    };
  }

  async getAllUserWallets(): Promise<UserWallet[]> {
    return await db.select().from(userWallets).orderBy(desc(userWallets.createdAt));
  }

  async getRecentTransactions(): Promise<WalletTransaction[]> {
    return await db
      .select()
      .from(walletTransactions)
      .orderBy(desc(walletTransactions.createdAt))
      .limit(50);
  }

  async getAllWalletTransactions(): Promise<WalletTransaction[]> {
    return await db
      .select()
      .from(walletTransactions)
      .orderBy(desc(walletTransactions.createdAt));
  }

  async adminDepositFunds(username: string, amountUsd: number, description: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }> {
    // Get or create wallet for user
    let wallet = await this.getUserWalletByUsername(username);
    
    if (!wallet) {
      // Create wallet if it doesn't exist  
      wallet = await this.createUserWallet({
        userId: username, // Use username as userId for Discord users
        username: username,
        balanceGp: 0,
        totalDepositedGp: 0,
        totalSpentGp: 0
      });
    }

    // Calculate GP equivalent (1M GP = $0.20)
    const gpAmount = Math.floor((amountUsd / 0.20) * 1000000);
    
    // Update wallet balance
    const newBalanceGp = wallet.balanceGp + gpAmount;
    const newTotalDepositedGp = wallet.totalDepositedGp + gpAmount;

    const [updatedWallet] = await db
      .update(userWallets)
      .set({
        balanceGp: newBalanceGp,
        totalDepositedGp: newTotalDepositedGp,
        updatedAt: new Date()
      })
      .where(eq(userWallets.id, wallet.id))
      .returning();

    // Create transaction record
    const [transaction] = await db
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        userId: wallet.userId,
        type: 'deposit',
        amount: amountUsd.toFixed(2),
        amountGp: gpAmount,
        currency: 'USD',
        description: description,
        status: 'completed'
      })
      .returning();

    return { wallet: updatedWallet, transaction };
  }

  async adminWithdrawFunds(username: string, amountUsd: number, description: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }> {
    // Get wallet for user
    const wallet = await this.getUserWalletByUsername(username);
    
    if (!wallet) {
      throw new Error('User wallet not found');
    }

    // Calculate GP equivalent (1M GP = $0.20)
    const gpAmount = Math.floor((amountUsd / 0.20) * 1000000);
    
    if (wallet.balanceGp < gpAmount) {
      throw new Error('Insufficient funds');
    }
    
    // Update wallet balance
    const newBalanceGp = Math.max(0, wallet.balanceGp - gpAmount);
    const newTotalSpentGp = wallet.totalSpentGp + gpAmount;

    const [updatedWallet] = await db
      .update(userWallets)
      .set({
        balanceGp: newBalanceGp,
        totalSpentGp: newTotalSpentGp,
        updatedAt: new Date()
      })
      .where(eq(userWallets.id, wallet.id))
      .returning();

    // Create transaction record
    const [transaction] = await db
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        userId: wallet.userId,
        type: 'withdrawal',
        amount: amountUsd.toFixed(2),
        amountGp: gpAmount,
        currency: 'USD',
        description: description,
        status: 'completed'
      })
      .returning();

    return { wallet: updatedWallet, transaction };
  }

  async adminSetWalletBalance(walletId: string, balanceUsd: string, balanceGp: number): Promise<UserWallet | undefined> {
    const [wallet] = await db
      .update(userWallets)
      .set({
        balanceGp: balanceGp,
        updatedAt: new Date()
      })
      .where(eq(userWallets.id, walletId))
      .returning();
    
    return wallet || undefined;
  }

  async depositToWallet(userId: string, amountUsd: number, description?: string): Promise<UserWallet | undefined> {
    // Validate input parameters
    if (!userId) {
      throw new Error('userId is required');
    }
    if (typeof amountUsd !== 'number' || isNaN(amountUsd) || amountUsd <= 0) {
      throw new Error(`Invalid amount: ${amountUsd}. Must be a positive number.`);
    }

    // Get or create wallet for user
    let wallet = await this.getUserWallet(userId);
    
    if (!wallet) {
      // Create wallet if it doesn't exist  
      wallet = await this.createUserWallet({
        userId: userId,
        username: userId, // Use userId as username fallback for Discord users
        balanceGp: 0,
        totalDepositedGp: 0,
        totalSpentGp: 0
      });
    }

    // Calculate GP equivalent (1M GP = $0.20)
    const gpAmount = Math.floor((amountUsd / 0.20) * 1000000);
    
    // Update wallet balance
    const newBalanceGp = wallet.balanceGp + gpAmount;
    const newTotalDepositedGp = wallet.totalDepositedGp + gpAmount;

    const [updatedWallet] = await db
      .update(userWallets)
      .set({
        balanceGp: newBalanceGp,
        totalDepositedGp: newTotalDepositedGp,
        updatedAt: new Date()
      })
      .where(eq(userWallets.id, wallet.id))
      .returning();

    // Create transaction record
    await db
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        userId: wallet.userId,
        type: 'deposit',
        amount: amountUsd.toFixed(2),
        amountGp: gpAmount,
        currency: 'USD',
        description: description || 'Deposit',
        status: 'completed'
      });

    return updatedWallet || undefined;
  }

  async adminAdjustGPCredits(walletId: string, amount: number, operation: 'add' | 'remove', description: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
  }> {
    // Get user wallet by wallet ID
    let wallet = await this.getUserWalletById(walletId);
    if (!wallet) {
      throw new Error('User wallet not found');
    }

    // Calculate new balance
    const gpChange = operation === 'add' ? amount : -amount;
    const newBalanceGp = Math.max(0, wallet.balanceGp + gpChange); // Don't allow negative balance

    // Update wallet
    const [updatedWallet] = await db
      .update(userWallets)
      .set({
        balanceGp: newBalanceGp,
        updatedAt: new Date()
      })
      .where(eq(userWallets.id, walletId))
      .returning();

    // Create transaction record
    const [transaction] = await db
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        userId: wallet.userId,
        type: operation === 'add' ? 'deposit' : 'withdrawal',
        amount: '0.00', // GP-only transaction
        amountGp: Math.abs(gpChange),
        currency: 'GP',
        description: description,
        status: 'completed'
      })
      .returning();

    return {
      wallet: updatedWallet,
      transaction: transaction
    };
  }

  // Direct GP removal for admin commands - works on all wallets for a user
  async adminRemoveGP(username: string, amountGp: number, description: string): Promise<{
    wallet: UserWallet;
    transaction: WalletTransaction;
    actualAmountRemoved: number;
  }> {
    // Get all wallets for user
    const allWallets = await this.getAllUserWalletsByUsername(username);
    
    if (allWallets.length === 0) {
      throw new Error('User wallet not found');
    }

    // Find the wallet with the most GP to remove from
    const wallet = allWallets.reduce((maxWallet, currentWallet) => 
      currentWallet.balanceGp > maxWallet.balanceGp ? currentWallet : maxWallet
    );

    // For admin removals, remove what's available (don't allow negative balances)
    const actualAmountToRemove = Math.min(amountGp, wallet.balanceGp);
    
    if (actualAmountToRemove === 0) {
      throw new Error('User has no GP balance to remove');
    }

    // Update wallet balance
    const newBalanceGp = wallet.balanceGp - actualAmountToRemove;

    const [updatedWallet] = await db
      .update(userWallets)
      .set({
        balanceGp: newBalanceGp,
        updatedAt: new Date()
      })
      .where(eq(userWallets.id, wallet.id))
      .returning();

    // Create transaction record for GP removal
    const [transaction] = await db
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        userId: wallet.userId,
        type: 'withdrawal',
        amount: '0.00', // GP-only transaction
        amountGp: actualAmountToRemove,
        currency: 'GP',
        description: `${description}${actualAmountToRemove < amountGp ? ` (Partial: ${actualAmountToRemove}/${amountGp} GP available)` : ''}`,
        status: 'completed'
      })
      .returning();

    return { wallet: updatedWallet, transaction, actualAmountRemoved: actualAmountToRemove };
  }

  // Order operations
  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return order || undefined;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByWorker(workerId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.workerId, workerId),
          inArray(orders.status, ['claimed', 'in_progress', 'confirmed', 'pending'])
        )
      )
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values(insertOrder)
      .returning();
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  // Order item operations
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(orderItems.createdAt);
  }

  async getOrderItem(id: string): Promise<OrderItem | undefined> {
    const [item] = await db.select().from(orderItems).where(eq(orderItems.id, id));
    return item || undefined;
  }

  async createOrderItem(insertOrderItem: InsertOrderItem): Promise<OrderItem> {
    const [item] = await db
      .insert(orderItems)
      .values(insertOrderItem)
      .returning();
    return item;
  }

  async updateOrderItem(id: string, updates: Partial<OrderItem>): Promise<OrderItem | undefined> {
    const [item] = await db
      .update(orderItems)
      .set(updates)
      .where(eq(orderItems.id, id))
      .returning();
    return item || undefined;
  }

  // Order status history operations
  async getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    return await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.createdAt));
  }

  async createOrderStatusHistory(insertHistory: InsertOrderStatusHistory): Promise<OrderStatusHistory> {
    const [history] = await db.insert(orderStatusHistory).values(insertHistory).returning();
    return history;
  }

  // Order Management Helpers
  async generateOrderNumber(): Promise<string> {
    // Get the latest order with "Job ID" format
    const { desc, like } = await import('drizzle-orm');
    const [latestJobIdOrder] = await db.select().from(orders)
      .where(like(orders.orderNumber, 'Job ID %'))
      .orderBy(desc(orders.createdAt))
      .limit(1);

    let nextNumber = 1;
    if (latestJobIdOrder?.orderNumber) {
      // Extract number from format like "Job ID 1", "Job ID 2"
      const match = latestJobIdOrder.orderNumber.match(/Job ID (\d+)$/);
      if (match) {
        const currentNumber = parseInt(match[1]);
        // Only increment if it's a reasonable number (not a timestamp)
        if (currentNumber < 100000) {
          nextNumber = currentNumber + 1;
        }
      }
    }

    return `Job ID ${nextNumber}`;
  }

  async updateOrderStatus(
    orderId: string, 
    newStatus: string, 
    updatedBy: string, 
    updatedByUsername: string, 
    notes?: string
  ): Promise<Order | undefined> {
    // Get current order to track previous status
    const currentOrder = await this.getOrder(orderId);
    if (!currentOrder) return undefined;

    // Update order status
    const updatedOrder = await this.updateOrder(orderId, { status: newStatus });
    if (!updatedOrder) return undefined;

    // Automatically unlock deposits and pay worker when order is completed
    if (newStatus === 'completed' && currentOrder.lockedDepositGp && currentOrder.lockedDepositGp > 0) {
      try {
        // Find the worker who claimed the order from the notes
        const claimedMatch = currentOrder.notes?.match(/Claimed by .+ \((\d+)\)/);
        if (claimedMatch) {
          const workerId = claimedMatch[1];
          const workerWallet = await this.getUserWallet(workerId);
          if (workerWallet) {
            // Unlock the deposit
            await this.unlockDeposit(workerWallet.id, currentOrder.lockedDepositGp);
            console.log(`✅ Automatically unlocked ${currentOrder.lockedDepositGp} GP deposit for order ${currentOrder.orderNumber}`);
            
            // Pay the worker - calculate their portion after platform commission
            const totalOrderValue = currentOrder.totalAmountGp || 0;
            const platformCommissionPercent = 30; // Platform takes 30%, worker gets 70%
            const workerPaymentAmount = Math.floor(totalOrderValue * (100 - platformCommissionPercent) / 100);
            
            if (workerPaymentAmount > 0) {
              await this.adminAdjustGPCredits(
                workerWallet.id,
                workerPaymentAmount,
                'add',
                `Worker payment for completed order ${currentOrder.orderNumber} (${100 - platformCommissionPercent}% of ${totalOrderValue} GP)`
              );
              console.log(`💰 Automatically paid worker ${workerPaymentAmount} GP (${100 - platformCommissionPercent}% of ${totalOrderValue} GP) for completing order ${currentOrder.orderNumber}`);
              
              // Update worker statistics - increment completed jobs and total earnings
              await this.updateUserWallet(workerWallet.id, {
                completedJobs: (workerWallet.completedJobs || 0) + 1,
                totalEarningsGp: (workerWallet.totalEarningsGp || 0) + workerPaymentAmount,
                updatedAt: new Date()
              });
              console.log(`📈 Updated worker stats: +1 job completed, +${workerPaymentAmount} GP total earnings`);
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to automatically unlock deposit and pay worker:', error);
      }
    }

    // Record status history
    await this.createOrderStatusHistory({
      orderId,
      previousStatus: currentOrder.status,
      newStatus,
      updatedBy,
      updatedByUsername,
      notes,
      isSystemUpdate: false
    });

    return updatedOrder;
  }

  async updateOrderItemStatus(
    itemId: string, 
    newStatus: string, 
    updatedBy: string, 
    updatedByUsername: string, 
    notes?: string
  ): Promise<OrderItem | undefined> {
    // Get current item to track previous status
    const currentItem = await this.getOrderItem(itemId);
    if (!currentItem) return undefined;

    // Update item status
    const updatedItem = await this.updateOrderItem(itemId, { status: newStatus });
    if (!updatedItem) return undefined;

    // Record status history
    await this.createOrderStatusHistory({
      orderId: currentItem.orderId,
      orderItemId: itemId,
      previousStatus: currentItem.status,
      newStatus,
      updatedBy,
      updatedByUsername,
      notes,
      isSystemUpdate: false
    });

    return updatedItem;
  }

  // Vouching operations
  async getVouchesByUser(userId: string): Promise<Vouch[]> {
    if (userId === 'all') {
      // Admin route - get all vouches
      return await db
        .select()
        .from(vouches)
        .where(eq(vouches.isActive, true))
        .orderBy(desc(vouches.createdAt))
        .limit(100); // Limit for performance
    }
    
    return await db
      .select()
      .from(vouches)
      .where(and(eq(vouches.vouchedUserId, userId), eq(vouches.isActive, true)))
      .orderBy(desc(vouches.createdAt));
  }

  async getVouchesByVoucher(voucherId: string): Promise<Vouch[]> {
    return await db
      .select()
      .from(vouches)
      .where(and(eq(vouches.voucherUserId, voucherId), eq(vouches.isActive, true)))
      .orderBy(desc(vouches.createdAt));
  }

  async createVouch(insertVouch: InsertVouch): Promise<Vouch> {
    const [vouch] = await db
      .insert(vouches)
      .values({
        ...insertVouch,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return vouch;
  }

  async updateVouch(id: string, updates: Partial<Vouch>): Promise<Vouch | undefined> {
    const [updatedVouch] = await db
      .update(vouches)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(vouches.id, id))
      .returning();
    return updatedVouch;
  }

  async deleteVouch(id: string): Promise<void> {
    await db
      .update(vouches)
      .set({ 
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(vouches.id, id));
  }

  async getVouchByOrderAndUser(orderNumber: string, userId: string): Promise<Vouch | undefined> {
    // Temporarily disable the duplicate check to get basic functionality working
    // TODO: Fix the SQL syntax issue later
    return undefined;
  }

  async getVouchReputationStats(userId: string): Promise<{
    totalVouches: number;
    positiveVouches: number;
    negativeVouches: number;
    reputationScore: number;
    vouchesByType: Record<string, number>;
  }> {
    // Get all vouches for this user
    const userVouches = await this.getVouchesByUser(userId);
    
    // Calculate stats
    const totalVouches = userVouches.length;
    const positiveVouches = userVouches.filter(v => v.isPositive).length;
    const negativeVouches = userVouches.filter(v => !v.isPositive).length;
    
    // Calculate reputation score (percentage positive)
    const reputationScore = totalVouches > 0 ? Math.round((positiveVouches / totalVouches) * 100) : 0;
    
    // Group by vouch type
    const vouchesByType = userVouches.reduce((acc, vouch) => {
      acc[vouch.vouchType] = (acc[vouch.vouchType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalVouches,
      positiveVouches,
      negativeVouches,
      reputationScore,
      vouchesByType,
    };
  }

  // GP Rates operations
  async getGpRates(): Promise<GpRate[]> {
    return await db.select().from(gpRates);
  }

  async getActiveGpRates(): Promise<GpRate[]> {
    return await db
      .select()
      .from(gpRates)
      .where(eq(gpRates.isActive, true))
      .orderBy(gpRates.sortOrder);
  }

  async getBuyingMethods(): Promise<GpRate[]> {
    return await db
      .select()
      .from(gpRates)
      .where(
        and(
          eq(gpRates.isActive, true),
          or(
            eq(gpRates.methodCategory, 'buying'),
            eq(gpRates.methodCategory, 'both')
          )
        )
      )
      .orderBy(gpRates.sortOrder);
  }

  async getSellingMethods(): Promise<GpRate[]> {
    return await db
      .select()
      .from(gpRates)
      .where(
        and(
          eq(gpRates.isActive, true),
          or(
            eq(gpRates.methodCategory, 'selling'),
            eq(gpRates.methodCategory, 'both')
          )
        )
      )
      .orderBy(gpRates.sortOrder);
  }

  async getGpRate(id: string): Promise<GpRate | undefined> {
    const result = await db
      .select()
      .from(gpRates)
      .where(eq(gpRates.id, id))
      .limit(1);
    return result[0];
  }

  async getGpRateByMethod(methodName: string): Promise<GpRate | undefined> {
    const result = await db
      .select()
      .from(gpRates)
      .where(eq(gpRates.methodName, methodName))
      .limit(1);
    return result[0];
  }

  async createGpRate(insertGpRate: InsertGpRate): Promise<GpRate> {
    const result = await db
      .insert(gpRates)
      .values(insertGpRate)
      .returning();
    return result[0];
  }

  async updateGpRate(id: string, updates: Partial<GpRate>): Promise<GpRate | undefined> {
    const result = await db
      .update(gpRates)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(gpRates.id, id))
      .returning();
    return result[0];
  }

  async deleteGpRate(id: string): Promise<void> {
    await db
      .delete(gpRates)
      .where(eq(gpRates.id, id));
  }

  // RSN Registration operations (for Dink webhook routing)
  async getRsnRegistration(rsn: string): Promise<RsnRegistration | undefined> {
    const [registration] = await db
      .select()
      .from(rsnRegistrations)
      .where(
        and(
          eq(rsnRegistrations.rsnLower, rsn.toLowerCase()),
          eq(rsnRegistrations.isActive, true)
        )
      );
    return registration || undefined;
  }

  async getRsnRegistrationByChannel(channelId: string): Promise<RsnRegistration | undefined> {
    const [registration] = await db
      .select()
      .from(rsnRegistrations)
      .where(
        and(
          eq(rsnRegistrations.channelId, channelId),
          eq(rsnRegistrations.isActive, true)
        )
      );
    return registration || undefined;
  }

  async getRsnRegistrationsByOrder(orderId: string): Promise<RsnRegistration[]> {
    return await db
      .select()
      .from(rsnRegistrations)
      .where(eq(rsnRegistrations.orderId, orderId));
  }

  async getActiveRsnRegistrations(): Promise<RsnRegistration[]> {
    return await db
      .select()
      .from(rsnRegistrations)
      .where(eq(rsnRegistrations.isActive, true));
  }

  async createRsnRegistration(insertRsn: InsertRsnRegistration): Promise<RsnRegistration> {
    const [registration] = await db
      .insert(rsnRegistrations)
      .values(insertRsn)
      .returning();
    return registration;
  }

  async updateRsnRegistration(id: string, updates: Partial<RsnRegistration>): Promise<RsnRegistration | undefined> {
    const [registration] = await db
      .update(rsnRegistrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rsnRegistrations.id, id))
      .returning();
    return registration || undefined;
  }

  async deactivateRsnRegistration(id: string): Promise<RsnRegistration | undefined> {
    const [registration] = await db
      .update(rsnRegistrations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(rsnRegistrations.id, id))
      .returning();
    return registration || undefined;
  }

  async deactivateRsnRegistrationsByOrder(orderId: string): Promise<void> {
    await db
      .update(rsnRegistrations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(rsnRegistrations.orderId, orderId));
  }

  // Bot Settings operations
  async getBotSetting(key: string): Promise<string | null> {
    const [setting] = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.key, key));
    return setting?.value || null;
  }

  async setBotSetting(key: string, value: string): Promise<void> {
    await db
      .insert(botSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: botSettings.key,
        set: { value, updatedAt: new Date() }
      });
  }

  // Order deletion
  async deleteOrder(orderId: string): Promise<void> {
    const { eq } = await import('drizzle-orm');
    
    // Delete order items first (foreign key constraint)
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    
    // Delete order status history  
    await db.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId));
    
    // Delete the order itself
    await db.delete(orders).where(eq(orders.id, orderId));
  }

  // Sythe Vouch operations (for forum scraping)
  async getSytheVouch(postId: string): Promise<SytheVouch | undefined> {
    const [vouch] = await db
      .select()
      .from(sytheVouches)
      .where(eq(sytheVouches.postId, postId));
    return vouch || undefined;
  }

  async getUnpostedSytheVouches(): Promise<SytheVouch[]> {
    return await db
      .select()
      .from(sytheVouches)
      .where(eq(sytheVouches.isPosted, false))
      .orderBy(asc(sytheVouches.createdAt));
  }

  async getAllSytheVouches(): Promise<SytheVouch[]> {
    return await db
      .select()
      .from(sytheVouches)
      .orderBy(desc(sytheVouches.createdAt));
  }

  async createSytheVouch(insertVouch: InsertSytheVouch): Promise<SytheVouch> {
    const [vouch] = await db
      .insert(sytheVouches)
      .values(insertVouch)
      .returning();
    return vouch;
  }

  async markSytheVouchPosted(id: string, discordMessageId: string): Promise<SytheVouch | undefined> {
    const [vouch] = await db
      .update(sytheVouches)
      .set({ isPosted: true, discordMessageId })
      .where(eq(sytheVouches.id, id))
      .returning();
    return vouch || undefined;
  }
}

// Export storage instance - use database storage by default
export const storage = new DatabaseStorage();