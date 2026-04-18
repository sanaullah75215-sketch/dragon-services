import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { startDiscordBot, getBotStatus, client } from "./bot/discord-bot";
import { insertServiceSchema, insertUserInteractionSchema, insertSpecialOfferSchema, insertUserWalletSchema, insertWalletTransactionSchema, insertPaymentMethodSchema, insertGpRateSchema } from "@shared/schema";
import ExcelJS from 'exceljs';
import { EmbedBuilder, TextChannel } from 'discord.js';

export async function registerRoutes(app: Express): Promise<Server> {
  // Start Discord bot
  startDiscordBot();

  // API Routes
  app.get("/api/services", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error) {
      res.status(400).json({ message: "Invalid service data" });
    }
  });

  app.patch("/api/services/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      console.log("PATCH service:", id, "with updates:", JSON.stringify(updates, null, 2));
      const service = await storage.updateService(id, updates);
      if (!service) {
        console.log("Service not found for id:", id);
        return res.status(404).json({ message: "Service not found" });
      }
      console.log("Service updated successfully:", service.id);
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(400).json({ message: "Invalid update data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const service = await storage.updateService(id, { isActive: false });
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json({ message: "Service deactivated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate service" });
    }
  });

  app.get("/api/bot-commands", async (req, res) => {
    try {
      const commands = await storage.getBotCommands();
      res.json(commands);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bot commands" });
    }
  });

  app.get("/api/bot-status", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const status = getBotStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bot status" });
    }
  });

  app.get("/api/user-interactions", async (req, res) => {
    try {
      const interactions = await storage.getUserInteractions();
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  app.post("/api/user-interactions", async (req, res) => {
    try {
      const validatedData = insertUserInteractionSchema.parse(req.body);
      const interaction = await storage.createUserInteraction(validatedData);
      res.status(201).json(interaction);
    } catch (error) {
      res.status(400).json({ message: "Invalid interaction data" });
    }
  });

  app.get("/api/user-interactions/service/:serviceId", async (req, res) => {
    try {
      const interactions = await storage.getUserInteractionsByService(req.params.serviceId);
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service interactions" });
    }
  });

  // Skills routes
  app.get("/api/skills", async (req, res) => {
    try {
      const skills = await storage.getSkills();
      res.json(skills);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch skills" });
    }
  });

  app.post("/api/skills", async (req, res) => {
    try {
      const { insertSkillSchema } = await import('@shared/schema');
      const validatedData = insertSkillSchema.parse(req.body);
      const skill = await storage.createSkill(validatedData);
      res.status(201).json(skill);
    } catch (error) {
      console.error('Error creating skill:', error);
      res.status(500).json({ message: 'Failed to create skill' });
    }
  });

  // Training methods routes
  app.get("/api/training-methods", async (req, res) => {
    try {
      const methods = await storage.getTrainingMethods();
      res.json(methods);
    } catch (error) {
      console.error('Error fetching training methods:', error);
      res.status(500).json({ message: 'Failed to fetch training methods' });
    }
  });

  app.get("/api/skills/:skillId/training-methods", async (req, res) => {
    try {
      const { skillId } = req.params;
      const methods = await storage.getTrainingMethodsBySkill(skillId);
      res.json(methods);
    } catch (error) {
      console.error('Error fetching training methods:', error);
      res.status(500).json({ message: 'Failed to fetch training methods' });
    }
  });

  app.post("/api/training-methods", async (req, res) => {
    try {
      const { insertTrainingMethodSchema } = await import('@shared/schema');
      const validatedData = insertTrainingMethodSchema.parse(req.body);
      const method = await storage.createTrainingMethod(validatedData);
      res.status(201).json(method);
    } catch (error) {
      console.error('Error creating training method:', error);
      res.status(500).json({ message: 'Failed to create training method' });
    }
  });

  app.put("/api/training-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const method = await storage.updateTrainingMethod(id, req.body);
      if (!method) {
        return res.status(404).json({ message: 'Training method not found' });
      }
      res.json(method);
    } catch (error) {
      console.error('Error updating training method:', error);
      res.status(500).json({ message: 'Failed to update training method' });
    }
  });

  app.delete("/api/training-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTrainingMethod(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting training method:', error);
      res.status(500).json({ message: 'Failed to delete training method' });
    }
  });

  // Quest routes
  app.get("/api/quests", async (req, res) => {
    try {
      const quests = await storage.getQuests();
      res.json(quests);
    } catch (error) {
      console.error('Error fetching quests:', error);
      res.status(500).json({ message: 'Failed to fetch quests' });
    }
  });

  app.post("/api/quests", async (req, res) => {
    try {
      const { insertQuestSchema } = await import('@shared/schema');
      const validatedData = insertQuestSchema.parse(req.body);
      const quest = await storage.createQuest(validatedData);
      res.status(201).json(quest);
    } catch (error: any) {
      console.error('Error creating quest:', error);
      res.status(500).json({ message: 'Failed to create quest', detail: error?.message || String(error) });
    }
  });

  app.put("/api/quests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const quest = await storage.updateQuest(id, req.body);
      if (!quest) {
        return res.status(404).json({ message: 'Quest not found' });
      }
      res.json(quest);
    } catch (error) {
      console.error('Error updating quest:', error);
      res.status(500).json({ message: 'Failed to update quest' });
    }
  });

  app.delete("/api/quests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteQuest(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting quest:', error);
      res.status(500).json({ message: 'Failed to delete quest' });
    }
  });

  // Quest pricing routes
  app.get("/api/quest-pricing", async (req, res) => {
    try {
      const pricing = await storage.getQuestPricing();
      res.json(pricing);
    } catch (error) {
      console.error('Error fetching quest pricing:', error);
      res.status(500).json({ message: 'Failed to fetch quest pricing' });
    }
  });

  app.get("/api/quests/:questId/pricing", async (req, res) => {
    try {
      const { questId } = req.params;
      const pricing = await storage.getQuestPricingByQuest(questId);
      res.json(pricing);
    } catch (error) {
      console.error('Error fetching quest pricing:', error);
      res.status(500).json({ message: 'Failed to fetch quest pricing' });
    }
  });

  app.post("/api/quest-pricing", async (req, res) => {
    try {
      const { insertQuestPricingSchema } = await import('@shared/schema');
      const validatedData = insertQuestPricingSchema.parse(req.body);
      const pricing = await storage.createQuestPricing(validatedData);
      res.status(201).json(pricing);
    } catch (error) {
      console.error('Error creating quest pricing:', error);
      res.status(500).json({ message: 'Failed to create quest pricing' });
    }
  });

  app.put("/api/quest-pricing/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const pricing = await storage.updateQuestPricing(id, req.body);
      if (!pricing) {
        return res.status(404).json({ message: 'Quest pricing not found' });
      }
      res.json(pricing);
    } catch (error) {
      console.error('Error updating quest pricing:', error);
      res.status(500).json({ message: 'Failed to update quest pricing' });
    }
  });

  app.delete("/api/quest-pricing/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteQuestPricing(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting quest pricing:', error);
      res.status(500).json({ message: 'Failed to delete quest pricing' });
    }
  });

  // Special Offers Routes
  app.get("/api/offers", async (req, res) => {
    try {
      const offers = await storage.getSpecialOffers();
      res.json(offers);
    } catch (error) {
      console.error('Error fetching special offers:', error);
      res.status(500).json({ message: 'Failed to fetch special offers' });
    }
  });

  app.get("/api/offers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const offer = await storage.getSpecialOffer(id);
      if (!offer) {
        return res.status(404).json({ message: 'Special offer not found' });
      }
      res.json(offer);
    } catch (error) {
      console.error('Error fetching special offer:', error);
      res.status(500).json({ message: 'Failed to fetch special offer' });
    }
  });

  app.post("/api/offers", async (req, res) => {
    try {
      // Convert date string to Date object if present
      const body = { ...req.body };
      if (body.expiresAt && typeof body.expiresAt === 'string') {
        body.expiresAt = new Date(body.expiresAt);
      }
      
      const validatedData = insertSpecialOfferSchema.parse(body);
      const offer = await storage.createSpecialOffer(validatedData);
      res.status(201).json(offer);
    } catch (error) {
      console.error('Error creating special offer:', error);
      res.status(500).json({ message: 'Failed to create special offer' });
    }
  });

  app.patch("/api/offers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const offer = await storage.updateSpecialOffer(id, updates);
      if (!offer) {
        return res.status(404).json({ message: 'Special offer not found' });
      }
      res.json(offer);
    } catch (error) {
      console.error('Error updating special offer:', error);
      res.status(500).json({ message: 'Failed to update special offer' });
    }
  });

  app.delete("/api/offers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSpecialOffer(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting special offer:', error);
      res.status(500).json({ message: 'Failed to delete special offer' });
    }
  });

  // GP Rates API Routes
  app.get("/api/gp-rates", async (req, res) => {
    try {
      const rates = await storage.getGpRates(); // Get ALL rates (active and disabled)
      res.json(rates);
    } catch (error) {
      console.error('Error fetching GP rates:', error);
      res.status(500).json({ message: 'Failed to fetch GP rates' });
    }
  });

  app.get("/api/gp-rates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const rate = await storage.getGpRate(id);
      if (!rate) {
        return res.status(404).json({ message: 'GP rate not found' });
      }
      res.json(rate);
    } catch (error) {
      console.error('Error fetching GP rate:', error);
      res.status(500).json({ message: 'Failed to fetch GP rate' });
    }
  });

  app.post("/api/gp-rates", async (req, res) => {
    try {
      const validatedData = insertGpRateSchema.parse(req.body);
      const rate = await storage.createGpRate(validatedData);
      res.status(201).json(rate);
    } catch (error: any) {
      console.error('Error creating GP rate:', error);
      
      // Check for duplicate method name error
      if (error?.code === '23505' && error?.constraint === 'gp_rates_method_name_unique') {
        return res.status(400).json({ 
          message: `A payment method with the name "${req.body.methodName}" already exists. Please use a different name or edit the existing method.` 
        });
      }
      
      res.status(400).json({ message: 'Invalid GP rate data' });
    }
  });

  app.patch("/api/gp-rates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const rate = await storage.updateGpRate(id, updates);
      if (!rate) {
        return res.status(404).json({ message: 'GP rate not found' });
      }
      res.json(rate);
    } catch (error: any) {
      console.error('Error updating GP rate:', error);
      
      // Check for duplicate method name error
      if (error?.code === '23505' && error?.constraint === 'gp_rates_method_name_unique') {
        return res.status(400).json({ 
          message: `A payment method with the name "${req.body.methodName}" already exists. Please use a different name.` 
        });
      }
      
      res.status(500).json({ message: 'Failed to update GP rate' });
    }
  });

  app.delete("/api/gp-rates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGpRate(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting GP rate:', error);
      res.status(500).json({ message: 'Failed to delete GP rate' });
    }
  });

  // Payment Methods API Routes
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const methods = await storage.getPaymentMethods();
      res.json(methods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ message: 'Failed to fetch payment methods' });
    }
  });

  app.get("/api/payment-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const method = await storage.getPaymentMethod(id);
      if (!method) {
        return res.status(404).json({ message: 'Payment method not found' });
      }
      res.json(method);
    } catch (error) {
      console.error('Error fetching payment method:', error);
      res.status(500).json({ message: 'Failed to fetch payment method' });
    }
  });

  app.post("/api/payment-methods", async (req, res) => {
    try {
      const validatedData = insertPaymentMethodSchema.parse(req.body);
      const method = await storage.createPaymentMethod(validatedData);
      res.status(201).json(method);
    } catch (error: any) {
      console.error('Error creating payment method:', error);
      if (error?.code === '23505') {
        return res.status(400).json({ 
          message: `A payment method with this name already exists.` 
        });
      }
      res.status(400).json({ message: 'Invalid payment method data' });
    }
  });

  app.patch("/api/payment-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const method = await storage.updatePaymentMethod(id, updates);
      if (!method) {
        return res.status(404).json({ message: 'Payment method not found' });
      }
      res.json(method);
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      if (error?.code === '23505') {
        return res.status(400).json({ 
          message: `A payment method with this name already exists.` 
        });
      }
      res.status(500).json({ message: 'Failed to update payment method' });
    }
  });

  app.delete("/api/payment-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePaymentMethod(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      res.status(500).json({ message: 'Failed to delete payment method' });
    }
  });

  // Wallet API Routes
  app.get("/api/wallets/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const wallet = await storage.getUserWallet(userId);
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
      res.json(wallet);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      res.status(500).json({ message: 'Failed to fetch wallet' });
    }
  });

  app.post("/api/wallets", async (req, res) => {
    try {
      const validatedData = insertUserWalletSchema.parse(req.body);
      const wallet = await storage.createUserWallet(validatedData);
      res.status(201).json(wallet);
    } catch (error) {
      console.error('Error creating wallet:', error);
      res.status(400).json({ message: 'Invalid wallet data' });
    }
  });

  app.patch("/api/wallets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const wallet = await storage.updateUserWallet(id, updates);
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
      res.json(wallet);
    } catch (error) {
      console.error('Error updating wallet:', error);
      res.status(500).json({ message: 'Failed to update wallet' });
    }
  });

  app.patch("/api/wallets/:userId/balance", async (req, res) => {
    try {
      const { userId } = req.params;
      const { gpAmount } = req.body;
      
      // Get user's wallet first
      const userWallet = await storage.getUserWallet(userId);
      if (!userWallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
      
      // Update balance
      const wallet = await storage.updateWalletBalance(userWallet.id, gpAmount);
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
      res.json(wallet);
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      res.status(500).json({ message: 'Failed to update wallet balance' });
    }
  });

  // Wallet Transactions Routes
  app.get("/api/wallets/:userId/transactions", async (req, res) => {
    try {
      const { userId } = req.params;
      const transactions = await storage.getWalletTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      res.status(500).json({ message: 'Failed to fetch wallet transactions' });
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const transaction = await storage.getWalletTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      res.json(transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ message: 'Failed to fetch transaction' });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertWalletTransactionSchema.parse(req.body);
      const transaction = await storage.createWalletTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(400).json({ message: 'Invalid transaction data' });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const transaction = await storage.updateWalletTransaction(id, updates);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      res.json(transaction);
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({ message: 'Failed to update transaction' });
    }
  });

  // Excel Export Routes - Admin Only
  app.get("/api/admin/export/wallets", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // Get all wallets
      const wallets = await storage.getAllUserWallets();
      
      // Filter by date if provided
      let filteredWallets = wallets;
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();
        end.setHours(23, 59, 59, 999); // Include full end date
        
        filteredWallets = wallets.filter(w => {
          const createdAt = w.createdAt ? new Date(w.createdAt) : new Date();
          return createdAt >= start && createdAt <= end;
        });
      }
      
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Dragon Services';
      workbook.created = new Date();
      
      const worksheet = workbook.addWorksheet('Discord Wallets');
      
      // Define columns
      worksheet.columns = [
        { header: 'Username', key: 'username', width: 20 },
        { header: 'Discord ID', key: 'userId', width: 22 },
        { header: 'Wallet Type', key: 'userType', width: 12 },
        { header: 'Balance (GP)', key: 'balanceGp', width: 18 },
        { header: 'Working Deposit (GP)', key: 'workingDepositGp', width: 20 },
        { header: 'Total Deposited (GP)', key: 'totalDepositedGp', width: 20 },
        { header: 'Total Spent (GP)', key: 'totalSpentGp', width: 18 },
        { header: 'Total Earnings (GP)', key: 'totalEarningsGp', width: 18 },
        { header: 'Completed Jobs', key: 'completedJobs', width: 14 },
        { header: 'Rank', key: 'rank', width: 12 },
        { header: 'Created Date', key: 'createdAt', width: 18 },
      ];
      
      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4A90A4' }
      };
      
      // Add data rows
      filteredWallets.forEach(wallet => {
        worksheet.addRow({
          username: wallet.username || 'Unknown',
          userId: wallet.userId,
          userType: wallet.userType || 'customer',
          balanceGp: wallet.balanceGp || 0,
          workingDepositGp: wallet.workingDepositGp || 0,
          totalDepositedGp: wallet.totalDepositedGp || 0,
          totalSpentGp: wallet.totalSpentGp || 0,
          totalEarningsGp: wallet.totalEarningsGp || 0,
          completedJobs: wallet.completedJobs || 0,
          rank: wallet.rank || 'None',
          createdAt: wallet.createdAt ? new Date(wallet.createdAt).toLocaleDateString() : 'N/A',
        });
      });
      
      // Add totals row
      const totalRow = worksheet.addRow({
        username: 'TOTAL',
        balanceGp: filteredWallets.reduce((sum, w) => sum + (w.balanceGp || 0), 0),
        workingDepositGp: filteredWallets.reduce((sum, w) => sum + (w.workingDepositGp || 0), 0),
        totalDepositedGp: filteredWallets.reduce((sum, w) => sum + (w.totalDepositedGp || 0), 0),
        totalSpentGp: filteredWallets.reduce((sum, w) => sum + (w.totalSpentGp || 0), 0),
        totalEarningsGp: filteredWallets.reduce((sum, w) => sum + (w.totalEarningsGp || 0), 0),
        completedJobs: filteredWallets.reduce((sum, w) => sum + (w.completedJobs || 0), 0),
      });
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF0' }
      };
      
      // Set response headers
      const dateStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=dragon-services-wallets-${dateStr}.xlsx`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error exporting wallets:', error);
      res.status(500).json({ message: 'Failed to export wallets' });
    }
  });

  app.get("/api/admin/export/transactions", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // Get all transactions
      const transactions = await storage.getAllWalletTransactions();
      
      // Filter by date if provided
      let filteredTransactions = transactions;
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();
        end.setHours(23, 59, 59, 999); // Include full end date
        
        filteredTransactions = transactions.filter(t => {
          const createdAt = t.createdAt ? new Date(t.createdAt) : new Date();
          return createdAt >= start && createdAt <= end;
        });
      }
      
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Dragon Services';
      workbook.created = new Date();
      
      const worksheet = workbook.addWorksheet('Transactions');
      
      // Define columns
      worksheet.columns = [
        { header: 'Date', key: 'createdAt', width: 18 },
        { header: 'User ID', key: 'userId', width: 22 },
        { header: 'Type', key: 'type', width: 12 },
        { header: 'Amount (GP)', key: 'amountGp', width: 18 },
        { header: 'Amount (USD)', key: 'amount', width: 14 },
        { header: 'Currency', key: 'currency', width: 10 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Status', key: 'status', width: 12 },
      ];
      
      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4A90A4' }
      };
      
      // Add data rows
      filteredTransactions.forEach(tx => {
        worksheet.addRow({
          createdAt: tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'N/A',
          userId: tx.userId,
          type: tx.type,
          amountGp: tx.amountGp || 0,
          amount: tx.amount || '0.00',
          currency: tx.currency || 'GP',
          description: tx.description || '',
          status: tx.status || 'completed',
        });
      });
      
      // Add summary row
      const deposits = filteredTransactions.filter(t => t.type === 'deposit');
      const withdrawals = filteredTransactions.filter(t => t.type === 'withdrawal');
      
      worksheet.addRow({});
      const summaryRow = worksheet.addRow({
        createdAt: 'SUMMARY',
        type: `${filteredTransactions.length} transactions`,
        amountGp: `Deposits: ${deposits.reduce((sum, t) => sum + (t.amountGp || 0), 0)} | Withdrawals: ${withdrawals.reduce((sum, t) => sum + (t.amountGp || 0), 0)}`,
      });
      summaryRow.font = { bold: true };
      
      // Set response headers
      const dateStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=dragon-services-transactions-${dateStr}.xlsx`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error exporting transactions:', error);
      res.status(500).json({ message: 'Failed to export transactions' });
    }
  });

  // Payment Methods Routes
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const { active } = req.query;
      const methods = active === 'true' 
        ? await storage.getActivePaymentMethods()
        : await storage.getPaymentMethods();
      res.json(methods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ message: 'Failed to fetch payment methods' });
    }
  });

  app.get("/api/payment-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const method = await storage.getPaymentMethod(id);
      if (!method) {
        return res.status(404).json({ message: 'Payment method not found' });
      }
      res.json(method);
    } catch (error) {
      console.error('Error fetching payment method:', error);
      res.status(500).json({ message: 'Failed to fetch payment method' });
    }
  });

  app.post("/api/payment-methods", async (req, res) => {
    try {
      const validatedData = insertPaymentMethodSchema.parse(req.body);
      const method = await storage.createPaymentMethod(validatedData);
      res.status(201).json(method);
    } catch (error) {
      console.error('Error creating payment method:', error);
      res.status(400).json({ message: 'Invalid payment method data' });
    }
  });

  app.patch("/api/payment-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const method = await storage.updatePaymentMethod(id, updates);
      if (!method) {
        return res.status(404).json({ message: 'Payment method not found' });
      }
      res.json(method);
    } catch (error) {
      console.error('Error updating payment method:', error);
      res.status(500).json({ message: 'Failed to update payment method' });
    }
  });

  app.delete("/api/payment-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePaymentMethod(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      res.status(500).json({ message: 'Failed to delete payment method' });
    }
  });

  // Admin Wallet Management Routes
  app.get("/api/admin/wallet-stats", async (req, res) => {
    try {
      const stats = await storage.getWalletStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
      res.status(500).json({ message: 'Failed to fetch wallet statistics' });
    }
  });

  app.get("/api/admin/wallets", async (req, res) => {
    try {
      const wallets = await storage.getAllUserWallets();
      res.json(wallets);
    } catch (error) {
      console.error('Error fetching all wallets:', error);
      res.status(500).json({ message: 'Failed to fetch wallets' });
    }
  });

  app.put("/api/admin/wallets/:walletId", async (req, res) => {
    try {
      const { walletId } = req.params;
      const updates = req.body;
      
      // Update wallet with new details
      const updatedWallet = await storage.updateUserWallet(walletId, {
        userType: updates.userType,
        balanceGp: updates.balanceGp,
        totalSpentGp: updates.totalSpentGp,
        totalDepositedGp: updates.totalDepositedGp,
        totalEarningsGp: updates.totalEarningsGp,
        completedJobs: updates.completedJobs,
        totalOrders: updates.totalOrders,
        customerRank: updates.customerRank,
        updatedAt: new Date(),
      });

      if (!updatedWallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }

      res.json(updatedWallet);
    } catch (error) {
      console.error('Error updating wallet:', error);
      res.status(500).json({ message: 'Failed to update wallet' });
    }
  });

  app.get("/api/admin/recent-transactions", async (req, res) => {
    try {
      const transactions = await storage.getRecentTransactions();
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      res.status(500).json({ message: 'Failed to fetch recent transactions' });
    }
  });

  // Admin Wallet Operations
  app.get("/api/admin/users/:username/wallet", async (req, res) => {
    try {
      const { username } = req.params;
      const wallet = await storage.getUserWalletByUsername(username);
      if (!wallet) {
        return res.status(404).json({ message: 'User wallet not found' });
      }
      res.json(wallet);
    } catch (error) {
      console.error('Error fetching user wallet:', error);
      res.status(500).json({ message: 'Failed to fetch user wallet' });
    }
  });

  app.post("/api/admin/users/:username/deposit", async (req, res) => {
    try {
      const { username } = req.params;
      const { amountUsd, description } = req.body;
      
      if (!amountUsd || amountUsd <= 0) {
        return res.status(400).json({ message: 'Valid deposit amount required' });
      }

      const result = await storage.adminDepositFunds(username, parseFloat(amountUsd), description || 'Admin deposit');
      res.json(result);
    } catch (error) {
      console.error('Error processing admin deposit:', error);
      res.status(500).json({ message: 'Failed to process deposit' });
    }
  });

  app.post("/api/admin/users/:username/withdraw", async (req, res) => {
    try {
      const { username } = req.params;
      const { amountUsd, description } = req.body;
      
      if (!amountUsd || amountUsd <= 0) {
        return res.status(400).json({ message: 'Valid withdrawal amount required' });
      }

      const result = await storage.adminWithdrawFunds(username, parseFloat(amountUsd), description || 'Admin withdrawal');
      res.json(result);
    } catch (error) {
      console.error('Error processing admin withdrawal:', error);
      res.status(500).json({ message: 'Failed to process withdrawal' });
    }
  });

  app.patch("/api/admin/wallets/:id/balance", async (req, res) => {
    try {
      const { id } = req.params;
      const { balanceUsd, balanceGp } = req.body;
      
      const wallet = await storage.adminSetWalletBalance(id, balanceUsd, balanceGp);
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
      res.json(wallet);
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      res.status(500).json({ message: 'Failed to update wallet balance' });
    }
  });

  // Admin rank and credit management routes
  app.patch("/api/admin/users/:userId/rank", async (req, res) => {
    try {
      const { userId } = req.params;
      const { manualRank } = req.body;
      
      // Validate rank if provided
      if (manualRank && !['IRON', 'STEEL', 'BLACK', 'ADAMANT', 'RUNE'].includes(manualRank)) {
        return res.status(400).json({ message: 'Invalid rank. Must be IRON, STEEL, BLACK, ADAMANT, or RUNE' });
      }
      
      const wallet = await storage.updateUserManualRank(userId, manualRank);
      if (!wallet) {
        return res.status(404).json({ message: 'User wallet not found' });
      }
      res.json(wallet);
    } catch (error) {
      console.error('Error updating user rank:', error);
      res.status(500).json({ message: 'Failed to update user rank' });
    }
  });

  app.post("/api/admin/users/:userId/credits", async (req, res) => {
    try {
      const { userId } = req.params;
      const { amount, description, operation } = req.body; // operation: 'add' or 'remove'
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid amount required' });
      }
      
      if (!['add', 'remove'].includes(operation)) {
        return res.status(400).json({ message: 'Operation must be "add" or "remove"' });
      }
      
      const result = await storage.adminAdjustGPCredits(userId, amount, operation, description || `Admin ${operation} credits`);
      res.json(result);
    } catch (error) {
      console.error('Error adjusting credits:', error);
      res.status(500).json({ message: 'Failed to adjust credits' });
    }
  });

  app.get("/api/admin/users/search", async (req, res) => {
    try {
      const { query } = req.query;
      const users = await storage.searchUsers(query as string);
      res.json(users);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ message: 'Failed to search users' });
    }
  });

  app.get("/api/admin/users/:userId/details", async (req, res) => {
    try {
      const { userId } = req.params;
      const wallet = await storage.getUserWallet(userId);
      if (!wallet) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get rank info
      const { getCustomerRank, getRankProgress } = await import('@shared/ranks');
      const rank = getCustomerRank(wallet.totalSpentGp, wallet.manualRank);
      const progress = getRankProgress(wallet.totalSpentGp, wallet.manualRank);
      
      res.json({
        ...wallet,
        rank,
        progress
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ message: 'Failed to fetch user details' });
    }
  });

  // Orders API Routes
  app.get("/api/orders", (req, res, next) => {
    // Prevent caching to ensure fresh data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  }, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.get("/api/orders/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Get order items
      const items = await storage.getOrderItems(orderId);
      
      // Get status history
      const statusHistory = await storage.getOrderStatusHistory(orderId);
      
      res.json({
        ...order,
        items,
        statusHistory
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ message: 'Failed to fetch order' });
    }
  });

  app.get("/api/users/:userId/orders", async (req, res) => {
    try {
      const { userId } = req.params;
      const orders = await storage.getOrdersByUser(userId);
      
      // Get items for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          return { ...order, items };
        })
      );
      
      res.json(ordersWithItems);
    } catch (error) {
      console.error('Error fetching user orders:', error);
      res.status(500).json({ message: 'Failed to fetch user orders' });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { userId, username, items, notes } = req.body;
      
      // Validate required fields
      if (!userId || !username || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Missing required fields: userId, username, items' });
      }

      // Get user wallet
      const wallet = await storage.getUserWallet(userId);
      if (!wallet) {
        return res.status(404).json({ message: 'User wallet not found' });
      }

      // Calculate totals and apply discounts
      const { getCustomerRank, getCustomerDiscount } = await import('@shared/ranks');
      const customerRank = getCustomerRank(wallet.totalSpentGp || 0, wallet.manualRank);
      const discountPercentage = getCustomerDiscount(wallet.totalSpentGp || 0, wallet.manualRank);
      
      let originalTotal = 0;
      const orderItems = items.map((item: any) => {
        const unitPrice = typeof item.unitPriceGp === 'string' ? parseInt(item.unitPriceGp) : item.unitPriceGp;
        const quantity = item.quantity || 1;
        const totalPrice = unitPrice * quantity;
        originalTotal += totalPrice;
        
        return {
          serviceType: item.serviceType,
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          description: item.description,
          quantity,
          unitPriceGp: unitPrice,
          totalPriceGp: totalPrice,
          configuration: item.configuration || {},
          status: 'pending'
        };
      });

      const discountAmount = Math.floor(originalTotal * (discountPercentage / 100));
      const finalTotal = originalTotal - discountAmount;

      // Debug logging
      console.log('Order Creation Debug:', {
        userId,
        username,
        walletBalanceGp: wallet.balanceGp,
        walletBalanceType: typeof wallet.balanceGp,
        originalTotal,
        discountPercentage,
        discountAmount,
        finalTotal,
        finalTotalType: typeof finalTotal,
        hasEnoughBalance: wallet.balanceGp >= finalTotal
      });

      // Check if user has sufficient balance
      if (wallet.balanceGp < finalTotal) {
        console.log('INSUFFICIENT BALANCE ERROR:', {
          required: finalTotal,
          available: wallet.balanceGp,
          difference: finalTotal - wallet.balanceGp
        });
        return res.status(400).json({ 
          message: 'Insufficient balance',
          required: finalTotal,
          available: wallet.balanceGp
        });
      }

      // Generate order number
      const orderNumber = await storage.generateOrderNumber();

      // Create order
      const order = await storage.createOrder({
        orderNumber,
        userId,
        username,
        walletId: wallet.id,
        status: 'pending',
        totalAmountGp: finalTotal,
        originalAmountGp: originalTotal,
        discountApplied: discountPercentage,
        discountAmountGp: discountAmount,
        customerRank: customerRank?.name || null,
        paymentStatus: 'pending',
        notes
      });

      // Create order items
      const createdItems = await Promise.all(
        orderItems.map((item: any) => 
          storage.createOrderItem({
            orderId: order.id,
            ...item
          })
        )
      );

      // Create initial status history
      await storage.createOrderStatusHistory({
        orderId: order.id,
        previousStatus: null,
        newStatus: 'pending',
        updatedBy: userId,
        updatedByUsername: username,
        notes: 'Order created',
        isSystemUpdate: true
      });

      // Deduct order amount from wallet and create transaction
      const { wallet: updatedWallet, transaction } = await storage.deductOrderAmount(
        userId,
        finalTotal,
        orderNumber,
        `Order #${orderNumber} - ${items.map((i: any) => i.serviceName).join(', ')}`
      );

      res.status(201).json({
        ...order,
        items: createdItems,
        walletBalance: updatedWallet.balanceGp,
        transaction
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ message: 'Failed to create order' });
    }
  });

  app.put("/api/orders/:orderId/status", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status, updatedBy, updatedByUsername, notes } = req.body;
      
      if (!status || !updatedBy || !updatedByUsername) {
        return res.status(400).json({ message: 'Missing required fields: status, updatedBy, updatedByUsername' });
      }

      const updatedOrder = await storage.updateOrderStatus(
        orderId,
        status,
        updatedBy,
        updatedByUsername,
        notes
      );

      if (!updatedOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Failed to update order status' });
    }
  });

  app.put("/api/orders/:orderId/payment", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { action } = req.body; // 'confirm' or 'cancel'
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      if (action === 'confirm') {
        // Deduct from wallet balance
        const wallet = await storage.getUserWallet(order.userId);
        if (!wallet) {
          return res.status(404).json({ message: 'User wallet not found' });
        }

        if (wallet.balanceGp < order.totalAmountGp) {
          return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Update wallet balance and spending
        await storage.updateUserWallet(wallet.id, {
          balanceGp: wallet.balanceGp - order.totalAmountGp,
          totalSpentGp: (wallet.totalSpentGp || 0) + order.totalAmountGp,
          totalOrders: wallet.totalOrders + 1
        });

        // Create transaction record
        const { insertWalletTransactionSchema } = await import('@shared/schema');
        await storage.createWalletTransaction({
          walletId: wallet.id,
          userId: order.userId,
          type: 'purchase',
          amount: '0.00',
          amountGp: order.totalAmountGp,
          currency: 'GP',
          description: `Order ${order.orderNumber} payment`,
          referenceId: order.id,
          status: 'completed'
        });

        // Update order payment status
        const updatedOrder = await storage.updateOrder(orderId, {
          paymentStatus: 'paid',
          status: 'confirmed'
        });

        // Create status history
        await storage.createOrderStatusHistory({
          orderId,
          previousStatus: order.status,
          newStatus: 'confirmed',
          updatedBy: 'system',
          updatedByUsername: 'System',
          notes: 'Payment confirmed and processed',
          isSystemUpdate: true
        });

        res.json(updatedOrder);
      } else if (action === 'cancel') {
        // Cancel order
        const updatedOrder = await storage.updateOrder(orderId, {
          paymentStatus: 'failed',
          status: 'cancelled'
        });

        await storage.createOrderStatusHistory({
          orderId,
          previousStatus: order.status,
          newStatus: 'cancelled',
          updatedBy: 'system',
          updatedByUsername: 'System',
          notes: 'Order cancelled',
          isSystemUpdate: true
        });

        res.json(updatedOrder);
      } else {
        res.status(400).json({ message: 'Invalid action. Use "confirm" or "cancel"' });
      }
    } catch (error) {
      console.error('Error processing order payment:', error);
      res.status(500).json({ message: 'Failed to process order payment' });
    }
  });

  // Delete order (admin only)
  app.delete("/api/orders/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // Check if order exists
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Delete order and all related data
      await storage.deleteOrder(orderId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ message: 'Failed to delete order' });
    }
  });

  // Vouching system routes
  app.get('/api/vouches', async (req, res) => {
    try {
      // Get all vouches for admin - need to modify storage to get all vouches
      const allVouches = await storage.getVouchesByUser('all'); 
      res.json(allVouches);
    } catch (error) {
      console.error('Error fetching vouches:', error);
      res.status(500).json({ message: 'Failed to fetch vouches' });
    }
  });

  app.get('/api/vouches/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const [vouches, stats] = await Promise.all([
        storage.getVouchesByUser(userId),
        storage.getVouchReputationStats(userId)
      ]);
      res.json({ vouches, stats });
    } catch (error) {
      console.error('Error fetching user vouches:', error);
      res.status(500).json({ message: 'Failed to fetch user vouches' });
    }
  });

  app.patch('/api/vouches/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const vouch = await storage.updateVouch(id, updates);
      if (!vouch) {
        return res.status(404).json({ message: 'Vouch not found' });
      }
      res.json(vouch);
    } catch (error) {
      console.error('Error updating vouch:', error);
      res.status(500).json({ message: 'Failed to update vouch' });
    }
  });

  app.delete('/api/vouches/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteVouch(id);
      res.json({ message: 'Vouch deleted successfully' });
    } catch (error) {
      console.error('Error deleting vouch:', error);
      res.status(500).json({ message: 'Failed to delete vouch' });
    }
  });

  // Dink webhook endpoint - receives RuneLite game updates
  // Whitelist of valid Dink event types
  const VALID_DINK_TYPES = new Set([
    'DEATH', 'LEVEL', 'LOOT', 'SLAYER', 'QUEST', 'CLUE', 'COLLECTION',
    'PET', 'SPEEDRUN', 'COMBAT_ACHIEVEMENT', 'CHAT', 'KILL_COUNT',
    'LOGIN', 'NOTIFICATION', 'PK', 'DIARY', 'GRAND_EXCHANGE'
  ]);
  
  app.post('/api/dink', async (req, res) => {
    try {
      const payload = req.body;
      
      // Basic payload validation
      if (!payload || typeof payload !== 'object') {
        console.log('⚠️ Dink webhook: Invalid payload format');
        return res.status(400).json({ message: 'Invalid payload format' });
      }
      
      // Validate event type against whitelist
      const validatedEventType = String(payload.type || 'UNKNOWN').toUpperCase();
      if (payload.type && !VALID_DINK_TYPES.has(validatedEventType) && validatedEventType !== 'UNKNOWN') {
        console.log(`⚠️ Dink webhook: Unknown event type "${validatedEventType}"`);
        return res.status(200).json({ message: 'Unknown event type ignored' });
      }
      
      // Extract player name from Dink payload
      // Dink payloads have playerName at the top level
      const rawPlayerName = payload.playerName || payload.extra?.playerName;
      
      if (!rawPlayerName || typeof rawPlayerName !== 'string') {
        console.log('⚠️ Dink webhook: No player name in payload');
        return res.status(200).json({ message: 'No player name provided' });
      }
      
      // Sanitize player name: trim and validate length (OSRS max is 12 chars)
      const playerName = rawPlayerName.trim().slice(0, 12);
      if (playerName.length === 0) {
        console.log('⚠️ Dink webhook: Empty player name after sanitization');
        return res.status(200).json({ message: 'Invalid player name' });
      }
      
      // Find RSN registration for this player (case-insensitive)
      const registration = await storage.getRsnRegistration(playerName);
      
      if (!registration || !registration.isActive) {
        console.log(`⚠️ Dink webhook: No active registration for RSN "${playerName}"`);
        return res.status(200).json({ message: 'RSN not registered' });
      }
      
      // Get the Discord channel
      if (!client.isReady()) {
        console.log('⚠️ Dink webhook: Discord client not ready');
        return res.status(503).json({ message: 'Discord bot not ready' });
      }
      
      const channel = await client.channels.fetch(registration.channelId).catch(() => null);
      
      if (!channel || !(channel instanceof TextChannel)) {
        console.log(`⚠️ Dink webhook: Channel ${registration.channelId} not found or not text channel`);
        return res.status(200).json({ message: 'Channel not found' });
      }
      
      // Parse the Dink event type and create appropriate embed
      const eventType = payload.type || 'UNKNOWN';
      const embed = createDinkEmbed(payload, eventType, playerName);
      
      // Send the embed to the channel
      await channel.send({ embeds: [embed] });
      
      console.log(`✅ Dink update routed: ${eventType} from ${playerName} to channel ${registration.channelId}`);
      
      res.status(200).json({ message: 'Webhook processed successfully' });
      
    } catch (error) {
      console.error('Error processing Dink webhook:', error);
      res.status(500).json({ message: 'Failed to process webhook' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper to sanitize text for Discord embeds (removes @mentions and links)
function sanitizeEmbedText(text: any): string {
  if (typeof text !== 'string') {
    return String(text ?? 'Unknown').slice(0, 100);
  }
  // Remove @everyone/@here, user/role mentions, and limit length
  return text
    .replace(/@(everyone|here)/gi, '[mention]')
    .replace(/<@[!&]?\d+>/g, '[user]')
    .replace(/<#\d+>/g, '[channel]')
    .slice(0, 200);
}

// Helper function to create Dink embed based on event type
function createDinkEmbed(payload: any, eventType: string, playerName: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTimestamp();
  
  switch (eventType) {
    case 'DEATH':
      embed
        .setTitle('💀 Player Death')
        .setDescription(`**${sanitizeEmbedText(playerName)}** has died!`)
        .setColor(0xFF0000)
        .addFields([
          { name: '📍 Location', value: sanitizeEmbedText(payload.extra?.location), inline: true },
          { name: '⚔️ Killer', value: sanitizeEmbedText(payload.extra?.killer), inline: true }
        ]);
      break;
      
    case 'LEVEL':
      embed
        .setTitle('📈 Level Up!')
        .setDescription(`**${sanitizeEmbedText(playerName)}** gained a level!`)
        .setColor(0x00FF00)
        .addFields([
          { name: '🎯 Skill', value: sanitizeEmbedText(payload.extra?.skillName), inline: true },
          { name: '📊 New Level', value: sanitizeEmbedText(payload.extra?.levelUp || payload.extra?.allLevels?.[payload.extra?.skillName] || '?'), inline: true }
        ]);
      break;
      
    case 'LOOT':
      const lootItems = Array.isArray(payload.extra?.items) ? payload.extra.items.slice(0, 10) : [];
      const lootValue = lootItems.reduce((sum: number, item: any) => sum + (Number(item?.priceEach || 0) * Number(item?.quantity || 0)), 0);
      const lootList = lootItems.slice(0, 5).map((item: any) => 
        `${sanitizeEmbedText(item?.quantity)}x ${sanitizeEmbedText(item?.name)} (${formatGp(Number(item?.priceEach || 0) * Number(item?.quantity || 0))})`
      ).join('\n') || 'No items';
      
      embed
        .setTitle('💰 Loot Drop')
        .setDescription(`**${sanitizeEmbedText(playerName)}** received loot from **${sanitizeEmbedText(payload.extra?.source)}**`)
        .setColor(0xFFD700)
        .addFields([
          { name: '📦 Items', value: lootList.slice(0, 1000), inline: false },
          { name: '💎 Total Value', value: formatGp(lootValue), inline: true }
        ]);
      break;
      
    case 'SLAYER':
      embed
        .setTitle('⚔️ Slayer Task')
        .setDescription(`**${sanitizeEmbedText(playerName)}** slayer task update`)
        .setColor(0x8B0000)
        .addFields([
          { name: '🎯 Task', value: sanitizeEmbedText(payload.extra?.task), inline: true },
          { name: '📊 Progress', value: sanitizeEmbedText(payload.extra?.progress), inline: true }
        ]);
      break;
      
    case 'QUEST':
      embed
        .setTitle('📜 Quest Complete!')
        .setDescription(`**${sanitizeEmbedText(playerName)}** completed a quest!`)
        .setColor(0x9932CC)
        .addFields([
          { name: '📖 Quest', value: sanitizeEmbedText(payload.extra?.questName), inline: true }
        ]);
      break;
      
    case 'CLUE':
      embed
        .setTitle('🗺️ Clue Scroll')
        .setDescription(`**${sanitizeEmbedText(playerName)}** completed a clue scroll!`)
        .setColor(0x4169E1)
        .addFields([
          { name: '📜 Tier', value: sanitizeEmbedText(payload.extra?.clueType), inline: true },
          { name: '🔢 Count', value: sanitizeEmbedText(payload.extra?.clueCount || '?'), inline: true }
        ]);
      break;
      
    case 'COLLECTION':
      embed
        .setTitle('📚 Collection Log')
        .setDescription(`**${sanitizeEmbedText(playerName)}** obtained a new collection log item!`)
        .setColor(0x32CD32)
        .addFields([
          { name: '🏆 Item', value: sanitizeEmbedText(payload.extra?.itemName), inline: true }
        ]);
      break;
      
    case 'PET':
      embed
        .setTitle('🐾 Pet Drop!')
        .setDescription(`**${sanitizeEmbedText(playerName)}** received a pet!`)
        .setColor(0xFF69B4)
        .addFields([
          { name: '🐶 Pet', value: sanitizeEmbedText(payload.extra?.petName), inline: true }
        ]);
      break;
      
    case 'SPEEDRUN':
      embed
        .setTitle('⏱️ Speedrun')
        .setDescription(`**${sanitizeEmbedText(playerName)}** completed a speedrun!`)
        .setColor(0x00CED1)
        .addFields([
          { name: '🎯 Quest', value: sanitizeEmbedText(payload.extra?.questName), inline: true },
          { name: '⏰ Time', value: sanitizeEmbedText(payload.extra?.time), inline: true }
        ]);
      break;
      
    case 'COMBAT_ACHIEVEMENT':
      embed
        .setTitle('🏅 Combat Achievement')
        .setDescription(`**${sanitizeEmbedText(playerName)}** completed a combat achievement!`)
        .setColor(0xB8860B)
        .addFields([
          { name: '🎖️ Achievement', value: sanitizeEmbedText(payload.extra?.task), inline: true },
          { name: '📊 Tier', value: sanitizeEmbedText(payload.extra?.tier), inline: true }
        ]);
      break;
      
    case 'CHAT':
      embed
        .setTitle('💬 Chat Message')
        .setDescription(`**${sanitizeEmbedText(playerName)}**: ${sanitizeEmbedText(payload.extra?.message)}`)
        .setColor(0x808080);
      break;
      
    default:
      embed
        .setTitle(`🎮 Game Update: ${sanitizeEmbedText(eventType)}`)
        .setDescription(`**${sanitizeEmbedText(playerName)}** triggered a game event`)
        .setColor(0x5865F2)
        .addFields([
          { name: '📝 Type', value: sanitizeEmbedText(eventType), inline: true }
        ]);
      
      // Do NOT add raw extra data from untrusted sources - only show event occurred
  }
  
  // Add footer
  embed.setFooter({
    text: '🐲 Dragon Services • Dink Updates',
    iconURL: 'https://oldschool.runescape.wiki/images/thumb/4/4e/Dragon_full_helm.png/21px-Dragon_full_helm.png'
  });
  
  return embed;
}

// Helper to format GP values
function formatGp(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B GP`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M GP`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K GP`;
  }
  return `${value} GP`;
}
