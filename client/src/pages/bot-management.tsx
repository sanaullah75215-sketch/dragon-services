import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "wouter";
import { ArrowLeft, Activity, Users, MessageSquare, Clock, Settings, Wallet, DollarSign, CreditCard, TrendingUp, Search, Plus, Minus, Edit3, UserCheck, UserCog, Crown, Briefcase, ShoppingCart, Award, Download, Calendar } from "lucide-react";
import { BotCommand, UserInteraction, UserWallet, WalletTransaction } from "@shared/schema";
import { getCustomerRank, getCustomerDiscount, formatGPAmount, getRankProgress } from "@shared/ranks";

// Type definitions
interface BotStatus {
  isOnline: boolean;
  uptime: number;
  serversCount: number;
  commandsRegistered: number;
  lastRestart?: string;
}

interface WalletStats {
  totalWallets: number;
  totalBalanceGp: number;
  totalDepositedGp: number;
  totalTransactions: number;
}

// Form schemas
const userSearchSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

const depositSchema = z.object({
  username: z.string().min(1, "Username is required"),
  amountGp: z.number().min(1, "Amount must be at least 1 GP"),
  description: z.string().optional(),
});

const withdrawalSchema = z.object({
  username: z.string().min(1, "Username is required"),
  amountGp: z.number().min(1, "Amount must be at least 1 GP"),
  description: z.string().optional(),
});

const walletEditSchema = z.object({
  username: z.string().min(1, "Username is required"),
  userType: z.enum(["customer", "worker"]),
  balanceGp: z.number().min(0, "Balance must be positive"),
  totalSpentGp: z.number().min(0, "Total spent must be positive"),
  totalEarningsGp: z.number().min(0, "Earnings must be positive"),
  completedJobs: z.number().int().min(0, "Jobs must be a positive integer"),
  totalOrders: z.number().int().min(0, "Orders must be a positive integer"),
  customerRank: z.number().min(0).max(100, "Rank must be between 0-100"),
});

const createUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  username: z.string().min(1, "Username is required"),
  userType: z.enum(["customer", "worker"]),
  balanceGp: z.number().min(0, "Balance must be positive").default(0),
  totalEarningsGp: z.number().min(0, "Earnings must be positive").default(0),
  completedJobs: z.number().int().min(0, "Jobs must be a positive integer").default(0),
  totalOrders: z.number().int().min(0, "Orders must be a positive integer").default(0),
  customerRank: z.number().min(0).max(100, "Rank must be between 0-100").default(0),
});

const creditManagementSchema = z.object({
  amount: z.number().min(1, "Amount must be at least 1 GP"),
  description: z.string().min(1, "Description is required")
});

const rankManagementSchema = z.object({
  rank: z.enum(['none', 'IRON', 'STEEL', 'BLACK', 'ADAMANT', 'RUNE'])
});

export default function BotManagement() {
  const [searchedWallet, setSearchedWallet] = useState<UserWallet | null>(null);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showWalletEditForm, setShowWalletEditForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState<UserWallet | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("demo-user-123");
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  
  // New admin management states
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [showRankForm, setShowRankForm] = useState(false);
  const [selectedWalletForCredit, setSelectedWalletForCredit] = useState<UserWallet | null>(null);
  const [selectedWalletForRank, setSelectedWalletForRank] = useState<UserWallet | null>(null);
  const [creditOperation, setCreditOperation] = useState<'add' | 'remove'>('add');
  
  // Excel export states
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: botStatus, isLoading: statusLoading } = useQuery<BotStatus>({
    queryKey: ["/api/bot-status"],
    refetchInterval: 10000,
  });

  const { data: commands, isLoading: commandsLoading } = useQuery<BotCommand[]>({
    queryKey: ["/api/bot-commands"],
  });

  const { data: interactions, isLoading: interactionsLoading } = useQuery<UserInteraction[]>({
    queryKey: ["/api/user-interactions"],
  });

  const { data: walletStats, isLoading: walletStatsLoading } = useQuery<WalletStats>({
    queryKey: ["/api/admin/wallet-stats"],
  });

  const { data: allWallets, isLoading: walletsLoading } = useQuery<UserWallet[]>({
    queryKey: ["/api/admin/wallets"],
  });

  // Selected user wallet
  const { data: selectedWallet, isLoading: selectedWalletLoading } = useQuery<UserWallet>({
    queryKey: ['/api/wallets', selectedUserId],
    retry: false,
  });

  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery<WalletTransaction[]>({
    queryKey: ["/api/admin/recent-transactions"],
  });

  // Forms
  const searchForm = useForm<z.infer<typeof userSearchSchema>>({
    resolver: zodResolver(userSearchSchema),
    defaultValues: { username: "" },
  });

  const depositForm = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: { username: "", amountGp: 0, description: "" },
  });

  const withdrawalForm = useForm<z.infer<typeof withdrawalSchema>>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: { username: "", amountGp: 0, description: "" },
  });

  const walletEditForm = useForm<z.infer<typeof walletEditSchema>>({
    resolver: zodResolver(walletEditSchema),
    defaultValues: { 
      username: "", 
      userType: "customer", 
      balanceGp: 0,
      totalSpentGp: 0,
      totalEarningsGp: 0,
      completedJobs: 0,
      totalOrders: 0,
      customerRank: 0
    },
  });

  const createUserForm = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { 
      userId: "", 
      username: "", 
      userType: "customer", 
      balanceGp: 0,
      totalEarningsGp: 0,
      completedJobs: 0,
      totalOrders: 0,
      customerRank: 0
    },
  });

  const creditForm = useForm<z.infer<typeof creditManagementSchema>>({
    resolver: zodResolver(creditManagementSchema),
    defaultValues: { amount: 0, description: "" },
  });

  const rankForm = useForm<z.infer<typeof rankManagementSchema>>({
    resolver: zodResolver(rankManagementSchema),
    defaultValues: { rank: "none" },
  });

  // Excel export handler
  const handleExport = async (type: 'wallets' | 'transactions') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportStartDate) params.append('startDate', exportStartDate);
      if (exportEndDate) params.append('endDate', exportEndDate);
      
      const url = `/api/admin/export/${type}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast({
        title: '🐲 Export Complete',
        description: `${type === 'wallets' ? 'Wallets' : 'Transactions'} exported successfully!`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Helper function to format GP amounts
  const formatGp = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M GP`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K GP`;
    }
    return `${amount.toLocaleString()} GP`;
  };

  // Mutations
  const searchWalletMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(username)}/wallet`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User wallet not found');
        }
        throw new Error('Failed to fetch wallet');
      }
      return response.json();
    },
    onSuccess: (wallet) => {
      setSearchedWallet(wallet);
      toast({
        title: "Wallet Found",
        description: `Found wallet for ${wallet.username}`,
      });
    },
    onError: (error: Error) => {
      setSearchedWallet(null);
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const depositMutation = useMutation({
    mutationFn: async (data: z.infer<typeof depositSchema>) => {
      return await apiRequest('POST', `/api/admin/users/${encodeURIComponent(data.username)}/deposit`, { 
        amountGp: data.amountGp, 
        description: data.description || `Admin deposit (${formatGp(data.amountGp)})` 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recent-transactions"] });
      setShowDepositForm(false);
      depositForm.reset();
      toast({
        title: "Deposit Successful",
        description: "Funds have been added to the user's wallet",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deposit Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const withdrawalMutation = useMutation({
    mutationFn: async (data: z.infer<typeof withdrawalSchema>) => {
      return await apiRequest('POST', `/api/admin/users/${encodeURIComponent(data.username)}/withdraw`, { 
        amountGp: data.amountGp, 
        description: data.description || `Admin withdrawal (${formatGp(data.amountGp)})` 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recent-transactions"] });
      setShowWithdrawForm(false);
      withdrawalForm.reset();
      toast({
        title: "Withdrawal Successful",
        description: "Funds have been removed from the user's wallet",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const walletEditMutation = useMutation({
    mutationFn: async (data: z.infer<typeof walletEditSchema>) => {
      if (!editingWallet) throw new Error('No wallet being edited');
      return await apiRequest('PUT', `/api/admin/wallets/${editingWallet.id}`, {
        userType: data.userType,
        balanceGp: data.balanceGp,
        totalSpentGp: data.totalSpentGp,
        totalDepositedGp: data.balanceGp + data.totalSpentGp, // Auto-calculate deposit
        totalEarningsGp: data.totalEarningsGp,
        completedJobs: data.completedJobs,
        totalOrders: data.totalOrders,
        customerRank: data.customerRank.toFixed(2)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-stats"] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallets', selectedUserId] });
      if (searchedWallet) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${searchedWallet.username}/wallet`] });
      }
      setShowWalletEditForm(false);
      setEditingWallet(null);
      walletEditForm.reset();
      toast({
        title: "Wallet Updated",
        description: "Wallet details have been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createUserSchema>) => {
      return await apiRequest('POST', '/api/wallets', {
        userId: data.userId,
        username: data.username,
        userType: data.userType,
        balanceGp: data.balanceGp,
        totalDepositedGp: 0,
        totalSpentGp: 0,
        totalEarningsGp: data.totalEarningsGp,
        completedJobs: data.completedJobs,
        totalOrders: data.totalOrders,
        customerRank: data.customerRank.toFixed(2)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-stats"] });
      setShowCreateUserForm(false);
      createUserForm.reset();
      toast({
        title: "User Created",
        description: "New user wallet has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Credit management mutation
  const creditMutation = useMutation({
    mutationFn: async (data: z.infer<typeof creditManagementSchema>) => {
      if (!selectedWalletForCredit) throw new Error("No wallet selected");
      
      return await apiRequest('POST', `/api/admin/users/${selectedWalletForCredit.userId}/credits`, {
        operation: creditOperation,
        amount: data.amount,
        description: data.description
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-stats"] });
      setShowCreditForm(false);
      setSelectedWalletForCredit(null);
      creditForm.reset();
      toast({
        title: `Credits ${creditOperation === 'add' ? 'Added' : 'Removed'}`,
        description: `Successfully ${creditOperation === 'add' ? 'added credits to' : 'removed credits from'} ${selectedWalletForCredit?.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Credit Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Rank management mutation
  const rankMutation = useMutation({
    mutationFn: async (data: z.infer<typeof rankManagementSchema>) => {
      if (!selectedWalletForRank) throw new Error("No wallet selected");
      
      return await apiRequest('PATCH', `/api/admin/users/${selectedWalletForRank.userId}/rank`, {
        rank: data.rank === 'none' ? null : data.rank
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      setShowRankForm(false);
      setSelectedWalletForRank(null);
      rankForm.reset();
      toast({
        title: "Rank Updated",
        description: `Successfully updated rank for ${selectedWalletForRank?.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Rank Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (statusLoading || commandsLoading || interactionsLoading || walletStatsLoading || walletsLoading || transactionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const formatUptime = (uptime: number) => {
    if (!uptime) return "0s";
    const seconds = Math.floor(uptime / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Bot Management</h1>
                <p className="text-muted-foreground">Monitor and manage your Discord bot</p>
              </div>
            </div>
            <Link href="/services">
              <Button variant="outline" data-testid="button-service-management">
                <Settings className="h-4 w-4 mr-2" />
                Service Management
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-status">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bot Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${botStatus?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-2xl font-bold">
                  {botStatus?.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Uptime: {formatUptime(botStatus?.uptime || 0)}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-servers">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Servers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{botStatus?.serversCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Connected guilds
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-commands">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commands</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{botStatus?.commandsRegistered || 0}</div>
              <p className="text-xs text-muted-foreground">
                Registered commands
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-interactions">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interactions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{interactions?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total interactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Management Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center">
            <Wallet className="h-6 w-6 mr-2 text-primary" />
            Wallet Management
          </h2>
          
          {/* Wallet Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card data-testid="card-total-wallets">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{walletStats?.totalWallets || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active user wallets
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-balance">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatGPAmount(walletStats?.totalBalanceGp || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  Combined user balances
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-deposits">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatGPAmount(walletStats?.totalDepositedGp || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  Lifetime deposits
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-transaction-volume">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transaction Volume</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{walletStats?.totalTransactions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total transactions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Discord Wallet Management Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center">
            <Wallet className="h-6 w-6 mr-2 text-primary" />
            Discord Wallet Management
          </h2>
          
          {/* Discord Users Wallet Table */}
          <Card data-testid="card-discord-wallet-management">
            <CardHeader>
              <CardTitle>Discord Users with Wallets</CardTitle>
              <div className="text-sm text-muted-foreground">
                Manage all Discord users who have created wallets
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Discord User</th>
                      <th className="text-left p-3 font-medium">User ID</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Rank & Discount</th>
                      <th className="text-left p-3 font-medium">Balance</th>
                      <th className="text-left p-3 font-medium">Stats</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allWallets?.map((wallet) => (
                      <tr key={wallet.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{wallet.username}</span>
                            <Badge variant="outline" className="text-xs">
                              Discord
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {wallet.userId}
                          </code>
                        </td>
                        <td className="p-3">
                          <Badge variant={wallet.userType === 'worker' ? 'default' : 'secondary'}>
                            <div className="flex items-center gap-1">
                              {wallet.userType === 'worker' ? <Briefcase className="w-3 h-3" /> : <ShoppingCart className="w-3 h-3" />}
                              {wallet.userType}
                            </div>
                          </Badge>
                        </td>
                        <td className="p-3">
                          {wallet.userType === 'customer' ? (
                            (() => {
                              const rank = getCustomerRank(wallet.totalSpentGp || 0);
                              return rank ? (
                                <div>
                                  <Badge variant="outline" className="mb-1" style={{ borderColor: rank.color }}>
                                    <span className="mr-1">{rank.emoji}</span>
                                    {rank.name}
                                  </Badge>
                                  <div className="text-xs text-green-600 font-medium">
                                    {rank.discountPercentage}% OFF
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Spent: {formatGPAmount(wallet.totalSpentGp || 0)}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  <div>No rank</div>
                                  <div>Need 1M GP spent</div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              Worker account
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{formatGp(wallet.balanceGp)}</div>
                          <div className="text-xs text-muted-foreground">Balance</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {wallet.userType === 'worker' ? (
                              <div>
                                <div>{wallet.completedJobs} jobs</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatGp(wallet.totalEarningsGp || 0)} earned
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div>{wallet.totalOrders} orders</div>
                                <div className="text-xs text-muted-foreground">
                                  {wallet.customerRank}% rank
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            {/* Edit Wallet */}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => {
                                setEditingWallet(wallet);
                                walletEditForm.reset({
                                  username: wallet.username,
                                  userType: wallet.userType as "customer" | "worker",
                                  balanceGp: wallet.balanceGp,
                                  totalSpentGp: wallet.totalSpentGp || 0,
                                  totalEarningsGp: wallet.totalEarningsGp || 0,
                                  completedJobs: wallet.completedJobs,
                                  totalOrders: wallet.totalOrders,
                                  customerRank: Number(wallet.customerRank)
                                });
                                setShowWalletEditForm(true);
                              }}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            
                            {/* Add GP Credits */}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs text-green-600"
                              onClick={() => {
                                setSelectedWalletForCredit(wallet);
                                setCreditOperation('add');
                                creditForm.reset({ amount: 0, description: 'Admin credit addition' });
                                setShowCreditForm(true);
                              }}
                              title="Add GP Credits"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            
                            {/* Remove GP Credits */}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs text-red-600"
                              onClick={() => {
                                setSelectedWalletForCredit(wallet);
                                setCreditOperation('remove');
                                creditForm.reset({ amount: 0, description: 'Admin credit removal' });
                                setShowCreditForm(true);
                              }}
                              title="Remove GP Credits"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            
                            {/* Edit Rank (only for customers) */}
                            {wallet.userType === 'customer' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs text-purple-600"
                                onClick={() => {
                                  setSelectedWalletForRank(wallet);
                                  const currentRank = (() => {
                                    const rank = getCustomerRank(wallet.totalSpentGp || 0, wallet.manualRank);
                                    return rank ? rank.name : 'none';
                                  })();
                                  rankForm.reset({ rank: (wallet.manualRank || currentRank) as "none" | "IRON" | "STEEL" | "BLACK" | "ADAMANT" | "RUNE" });
                                  setShowRankForm(true);
                                }}
                                title="Edit Customer Rank"
                              >
                                <Crown className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!allWallets || allWallets.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    No Discord users with wallets found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center">
            <UserCog className="h-6 w-6 mr-2 text-primary" />
            User Management
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* User Selector */}
            <Card data-testid="card-user-selector">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Select User
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="user-select">Choose User to Manage</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger data-testid="select-user">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="demo-user-123">Demo Worker</SelectItem>
                        <SelectItem value="demo-customer-456">Demo Customer</SelectItem>
                        <SelectItem value="current-user">Current User</SelectItem>
                        {allWallets?.filter(w => !['demo-user-123', 'demo-customer-456', 'current-user'].includes(w.userId)).map((wallet) => (
                          <SelectItem key={wallet.userId} value={wallet.userId}>
                            {wallet.username} ({wallet.userType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedWallet && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{selectedWallet.username}</span>
                        <Badge variant={selectedWallet.userType === 'worker' ? 'default' : 'secondary'}>
                          <div className="flex items-center gap-1">
                            {selectedWallet.userType === 'worker' ? <Briefcase className="w-3 h-3" /> : <ShoppingCart className="w-3 h-3" />}
                            {selectedWallet.userType}
                          </div>
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Balance: {formatGPAmount(selectedWallet.balanceGp)}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Create New User */}
            <Card data-testid="card-create-user">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCheck className="h-5 w-5 mr-2 text-green-600" />
                  Create New User
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showCreateUserForm ? (
                  <Button 
                    onClick={() => setShowCreateUserForm(true)} 
                    className="w-full"
                    data-testid="button-show-create-user-form"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New User
                  </Button>
                ) : (
                  <Form {...createUserForm}>
                    <form onSubmit={createUserForm.handleSubmit((data) => createUserMutation.mutate(data))} className="space-y-3">
                      <FormField
                        control={createUserForm.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User ID</FormLabel>
                            <FormControl>
                              <Input placeholder="user-123" {...field} data-testid="input-user-id" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createUserForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Username" {...field} data-testid="input-username" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createUserForm.control}
                        name="userType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-new-user-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="customer">Customer</SelectItem>
                                <SelectItem value="worker">Worker</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex space-x-2">
                        <Button 
                          type="submit" 
                          disabled={createUserMutation.isPending}
                          data-testid="button-submit-create-user"
                        >
                          {createUserMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowCreateUserForm(false)}
                          data-testid="button-cancel-create-user"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Admin Wallet Operations */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center">
            <Edit3 className="h-6 w-6 mr-2 text-primary" />
            Wallet Operations
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Search */}
            <Card data-testid="card-user-search">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Find User Wallet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...searchForm}>
                  <form onSubmit={searchForm.handleSubmit((data) => searchWalletMutation.mutate(data.username))} className="space-y-4">
                    <FormField
                      control={searchForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discord Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter username..." {...field} data-testid="input-search-username" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={searchWalletMutation.isPending}
                      data-testid="button-search-wallet"
                    >
                      {searchWalletMutation.isPending ? "Searching..." : "Search Wallet"}
                    </Button>
                  </form>
                </Form>

                {searchedWallet && (
                  <div className="mt-4 p-4 bg-muted rounded-lg space-y-3" data-testid="searched-wallet-display">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{searchedWallet.username}</div>
                      <Badge variant={searchedWallet.userType === 'worker' ? 'default' : 'secondary'} className="flex items-center gap-1">
                        {searchedWallet.userType === 'worker' ? <Briefcase className="w-3 h-3" /> : <ShoppingCart className="w-3 h-3" />}
                        {searchedWallet.userType}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Balance:</span> {formatGPAmount(searchedWallet.balanceGp)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Spent:</span> {formatGPAmount(searchedWallet.totalSpentGp)}
                      </div>
                      
                      {searchedWallet.userType === 'worker' ? (
                        <>
                          <div>
                            <span className="text-muted-foreground">Earnings:</span> {formatGPAmount(searchedWallet.totalEarningsGp)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Jobs:</span> {searchedWallet.completedJobs}
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-muted-foreground">Orders:</span> {searchedWallet.totalOrders}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rank:</span> {searchedWallet.customerRank}%
                          </div>
                        </>
                      )}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setEditingWallet(searchedWallet);
                        walletEditForm.reset({
                          username: searchedWallet.username,
                          userType: searchedWallet.userType as "customer" | "worker",
                          balanceGp: Number(searchedWallet.balanceGp),
                          totalSpentGp: Number(searchedWallet.totalSpentGp),
                          totalEarningsGp: Number(searchedWallet.totalEarningsGp),
                          completedJobs: searchedWallet.completedJobs,
                          totalOrders: searchedWallet.totalOrders,
                          customerRank: Number(searchedWallet.customerRank)
                        });
                        setShowWalletEditForm(true);
                      }}
                      data-testid="button-edit-wallet"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Wallet Details
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Deposit */}
            <Card data-testid="card-admin-deposit">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="h-5 w-5 mr-2 text-green-600" />
                  Add Funds
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showDepositForm ? (
                  <Button 
                    onClick={() => setShowDepositForm(true)} 
                    className="w-full" 
                    data-testid="button-show-deposit-form"
                  >
                    Open Deposit Form
                  </Button>
                ) : (
                  <Form {...depositForm}>
                    <form onSubmit={depositForm.handleSubmit((data) => depositMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={depositForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter username..." {...field} data-testid="input-deposit-username" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={depositForm.control}
                        name="amountGp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount (Millions GP)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="1"
                                placeholder="200"
                                value={field.value ? field.value / 1000000 : ''}
                                onChange={(e) => {
                                  const millions = parseFloat(e.target.value) || 0;
                                  field.onChange(millions * 1000000);
                                }}
                                data-testid="input-deposit-amount"
                              />
                            </FormControl>
                            <FormMessage />
                            {field.value > 0 && (
                              <div className="text-sm text-muted-foreground">
                                = {field.value.toLocaleString()} GP
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={depositForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Reason for deposit..." {...field} data-testid="textarea-deposit-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex space-x-2">
                        <Button 
                          type="submit" 
                          disabled={depositMutation.isPending}
                          data-testid="button-submit-deposit"
                        >
                          {depositMutation.isPending ? "Processing..." : "Deposit"}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowDepositForm(false)}
                          data-testid="button-cancel-deposit"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>

            {/* Quick Withdrawal */}
            <Card data-testid="card-admin-withdrawal">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Minus className="h-5 w-5 mr-2 text-red-600" />
                  Remove Funds
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showWithdrawForm ? (
                  <Button 
                    onClick={() => setShowWithdrawForm(true)} 
                    variant="destructive" 
                    className="w-full"
                    data-testid="button-show-withdrawal-form"
                  >
                    Open Withdrawal Form
                  </Button>
                ) : (
                  <Form {...withdrawalForm}>
                    <form onSubmit={withdrawalForm.handleSubmit((data) => withdrawalMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={withdrawalForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter username..." {...field} data-testid="input-withdrawal-username" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={withdrawalForm.control}
                        name="amountGp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount (Millions GP)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="1"
                                placeholder="200"
                                value={field.value ? field.value / 1000000 : ''}
                                onChange={(e) => {
                                  const millions = parseFloat(e.target.value) || 0;
                                  field.onChange(millions * 1000000);
                                }}
                                data-testid="input-withdrawal-amount"
                              />
                            </FormControl>
                            <FormMessage />
                            {field.value > 0 && (
                              <div className="text-sm text-muted-foreground">
                                = {field.value.toLocaleString()} GP
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={withdrawalForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Reason for withdrawal..." {...field} data-testid="textarea-withdrawal-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex space-x-2">
                        <Button 
                          type="submit" 
                          variant="destructive" 
                          disabled={withdrawalMutation.isPending}
                          data-testid="button-submit-withdrawal"
                        >
                          {withdrawalMutation.isPending ? "Processing..." : "Withdraw"}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowWithdrawForm(false)}
                          data-testid="button-cancel-withdrawal"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>

            {/* Wallet Editor */}
            {showWalletEditForm && editingWallet && (
              <Card data-testid="card-wallet-editor">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCog className="h-5 w-5 mr-2 text-blue-600" />
                    Edit Wallet: {editingWallet.username}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...walletEditForm}>
                    <form onSubmit={walletEditForm.handleSubmit((data) => walletEditMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={walletEditForm.control}
                        name="userType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-user-type">
                                  <SelectValue placeholder="Select user type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="customer">
                                  <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4" />
                                    Customer
                                  </div>
                                </SelectItem>
                                <SelectItem value="worker">
                                  <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4" />
                                    Worker
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={walletEditForm.control}
                        name="balanceGp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Balance (GP)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="1"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                data-testid="input-balance-gp"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {walletEditForm.watch("userType") === "worker" ? (
                        <>
                          <FormField
                            control={walletEditForm.control}
                            name="totalEarningsGp"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Total Earnings (GP)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="1"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    data-testid="input-total-earnings"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={walletEditForm.control}
                            name="completedJobs"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Completed Jobs</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    data-testid="input-completed-jobs"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      ) : (
                        <>
                          <FormField
                            control={walletEditForm.control}
                            name="totalOrders"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Total Orders</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    data-testid="input-total-orders"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={walletEditForm.control}
                            name="customerRank"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Customer Rank (%)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    placeholder="0.00"
                                    min="0"
                                    max="100"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    data-testid="input-customer-rank"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      <div className="flex space-x-2">
                        <Button 
                          type="submit" 
                          disabled={walletEditMutation.isPending}
                          data-testid="button-submit-wallet-edit"
                        >
                          {walletEditMutation.isPending ? "Updating..." : "Update Wallet"}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setShowWalletEditForm(false);
                            setEditingWallet(null);
                          }}
                          data-testid="button-cancel-wallet-edit"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Commands */}
          <Card data-testid="card-commands-list">
            <CardHeader>
              <CardTitle>Bot Commands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commands?.map((command) => (
                  <div key={command.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div>
                      <div className="font-medium">/{command.commandName}</div>
                      <div className="text-sm text-muted-foreground">{command.description}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={command.isEnabled ? "default" : "secondary"}>
                        {command.isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {command.usageCount} uses
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Interactions */}
          <Card data-testid="card-interactions-list">
            <CardHeader>
              <CardTitle>Recent Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {interactions?.slice(-10).reverse().map((interaction) => (
                  <div key={interaction.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div>
                      <div className="font-medium">{interaction.username}</div>
                      <div className="text-sm text-muted-foreground">
                        {interaction.selectedOption ? `Selected: ${interaction.selectedOption}` : 'Viewed service'}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={interaction.status === 'completed' ? "default" : "secondary"}>
                        {interaction.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(interaction.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {(!interactions || interactions.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    No interactions yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Discord Wallet Management System */}
          <Card data-testid="card-discord-wallet-management" className="col-span-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Discord Wallet Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage all Discord users with wallets, their balances, ranks, and roles
              </p>
            </CardHeader>
            <CardContent>
              {/* Wallet Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{allWallets?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">
                    {formatGp(allWallets?.reduce((sum, w) => sum + w.balanceGp, 0) || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Balance</div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">
                    {allWallets?.filter(w => w.userType === 'customer').length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Customers</div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">
                    {allWallets?.filter(w => w.userType === 'worker').length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Workers</div>
                </div>
              </div>

              {/* Excel Export Section */}
              <div className="p-4 rounded-lg border bg-muted/30 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Download className="w-5 h-5" />
                  <h3 className="font-medium">🐲 Export Data to Excel</h3>
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex gap-4 flex-1">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="export-start-date" className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Start Date
                      </Label>
                      <Input
                        id="export-start-date"
                        type="date"
                        value={exportStartDate}
                        onChange={(e) => setExportStartDate(e.target.value)}
                        className="w-36"
                        data-testid="input-export-start-date"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="export-end-date" className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        End Date
                      </Label>
                      <Input
                        id="export-end-date"
                        type="date"
                        value={exportEndDate}
                        onChange={(e) => setExportEndDate(e.target.value)}
                        className="w-36"
                        data-testid="input-export-end-date"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleExport('wallets')}
                      disabled={isExporting}
                      variant="default"
                      size="sm"
                      data-testid="button-export-wallets"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {isExporting ? 'Exporting...' : 'Export Wallets'}
                    </Button>
                    <Button
                      onClick={() => handleExport('transactions')}
                      disabled={isExporting}
                      variant="outline"
                      size="sm"
                      data-testid="button-export-transactions"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {isExporting ? 'Exporting...' : 'Export Transactions'}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Leave dates empty to export all data. Set date range to filter by creation date.
                </p>
              </div>

              {/* Enhanced User Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium">User</th>
                        <th className="text-left p-3 font-medium">Role/Rank</th>
                        <th className="text-right p-3 font-medium">Balance</th>
                        <th className="text-center p-3 font-medium">Stats</th>
                        <th className="text-center p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allWallets?.map((wallet) => {
                        const rankInfo = getCustomerRank(wallet.totalSpentGp || 0, wallet.manualRank);
                        const discountPercent = getCustomerDiscount(wallet.totalSpentGp || 0, wallet.manualRank);
                        
                        return (
                          <tr key={wallet.id} className="hover:bg-muted/30">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium">{wallet.username}</div>
                                  <div className="text-xs text-muted-foreground">
                                    ID: {wallet.userId}
                                  </div>
                                </div>
                                <Badge variant={wallet.userType === 'worker' ? 'default' : 'secondary'} className="text-xs ml-2">
                                  {wallet.userType === 'worker' ? <Briefcase className="w-3 h-3 mr-1" /> : <ShoppingCart className="w-3 h-3 mr-1" />}
                                  {wallet.userType}
                                </Badge>
                              </div>
                            </td>
                            <td className="p-3">
                              {wallet.userType === 'customer' ? (
                                <div className="flex items-center gap-2">
                                  {rankInfo ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-lg">{rankInfo.emoji}</span>
                                      <span className="font-medium text-sm">{rankInfo.name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">No Rank</span>
                                  )}
                                  {discountPercent > 0 && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      -{discountPercent}%
                                    </Badge>
                                  )}
                                  {wallet.manualRank && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      Manual
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="default" className="text-xs">
                                  <Briefcase className="w-3 h-3 mr-1" />
                                  Worker
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="font-bold text-green-600">{formatGp(wallet.balanceGp)}</div>
                              {wallet.userType === 'customer' && wallet.totalSpentGp > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  Spent: {formatGp(wallet.totalSpentGp)}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="text-sm">
                                {wallet.userType === 'worker' ? (
                                  <>
                                    <div>{wallet.completedJobs} jobs</div>
                                    <div className="text-xs text-muted-foreground">
                                      {formatGp(wallet.totalEarningsGp || 0)} earned
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>{wallet.totalOrders} orders</div>
                                    <div className="text-xs text-muted-foreground">
                                      {rankInfo ? 
                                        `Progress: ${((wallet.totalSpentGp || 0) / Math.max(rankInfo.minSpent, 1) * 100).toFixed(0)}%` :
                                        'No rank progress'
                                      }
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1">
                                {/* Edit Wallet Button */}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    setEditingWallet(wallet);
                                    walletEditForm.reset({
                                      username: wallet.username,
                                      userType: wallet.userType as "customer" | "worker",
                                      balanceGp: wallet.balanceGp,
                                      totalSpentGp: wallet.totalSpentGp || 0,
                                      totalEarningsGp: wallet.totalEarningsGp || 0,
                                      completedJobs: wallet.completedJobs,
                                      totalOrders: wallet.totalOrders,
                                      customerRank: Number(wallet.customerRank || 0)
                                    });
                                    setShowWalletEditForm(true);
                                  }}
                                  title="Edit Wallet"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>

                                {/* Add Credits Button */}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => {
                                    setSelectedWalletForCredit(wallet);
                                    setCreditOperation('add');
                                    creditForm.reset({ amount: 0, description: "" });
                                    setShowCreditForm(true);
                                  }}
                                  title="Add Credits"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>

                                {/* Remove Credits Button */}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedWalletForCredit(wallet);
                                    setCreditOperation('remove');
                                    creditForm.reset({ amount: 0, description: "" });
                                    setShowCreditForm(true);
                                  }}
                                  title="Remove Credits"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>

                                {/* Rank Management for Customers */}
                                {wallet.userType === 'customer' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                    onClick={() => {
                                      setSelectedWalletForRank(wallet);
                                      rankForm.reset({ rank: (wallet.manualRank || 'none') as "none" | "IRON" | "STEEL" | "BLACK" | "ADAMANT" | "RUNE" });
                                      setShowRankForm(true);
                                    }}
                                    title="Edit Rank"
                                  >
                                    👑
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {(!allWallets || allWallets.length === 0) && (
                  <div className="text-center text-muted-foreground py-12">
                    <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <div className="font-medium mb-2">No Discord wallets found</div>
                    <div className="text-sm">Users will appear here once they interact with the Discord bot</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Wallet Transactions */}
          <Card data-testid="card-wallet-transactions">
            <CardHeader>
              <CardTitle>Recent Wallet Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentTransactions?.slice(0, 10).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.type} • {new Date(transaction.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'deposit' ? '+' : '-'}{formatGp(transaction.amountGp || 0)}
                      </div>
                      <Badge variant={transaction.status === 'completed' ? "default" : "secondary"}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!recentTransactions || recentTransactions.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    No transactions found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Wallet Dialog */}
      <Dialog open={showWalletEditForm} onOpenChange={setShowWalletEditForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Wallet - {editingWallet?.username}</DialogTitle>
          </DialogHeader>
          <Form {...walletEditForm}>
            <form onSubmit={walletEditForm.handleSubmit((data) => walletEditMutation.mutate(data))} className="space-y-4">
              <FormField
                control={walletEditForm.control}
                name="userType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={walletEditForm.control}
                name="balanceGp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Balance (Millions GP)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="1"
                        placeholder="200"
                        value={field.value ? field.value / 1000000 : ''}
                        onChange={(e) => {
                          const millions = parseFloat(e.target.value) || 0;
                          field.onChange(millions * 1000000);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    {field.value > 0 && (
                      <div className="text-sm text-muted-foreground">
                        = {field.value.toLocaleString()} GP
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={walletEditForm.control}
                name="totalSpentGp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Spent (Millions GP)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="1"
                        placeholder="0"
                        value={field.value ? field.value / 1000000 : ''}
                        onChange={(e) => {
                          const millions = parseFloat(e.target.value) || 0;
                          field.onChange(millions * 1000000);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="text-sm text-muted-foreground">
                      {field.value > 0 && `= ${field.value.toLocaleString()} GP`}
                      <br />Affects customer rank calculation
                    </div>
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowWalletEditForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={walletEditMutation.isPending}>
                  {walletEditMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={showDepositForm} onOpenChange={setShowDepositForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Funds to Wallet</DialogTitle>
          </DialogHeader>
          <Form {...depositForm}>
            <form onSubmit={depositForm.handleSubmit((data) => depositMutation.mutate(data))} className="space-y-4">
              <FormField
                control={depositForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={depositForm.control}
                name="amountGp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (Millions GP)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="1"
                        placeholder="200"
                        value={field.value ? field.value / 1000000 : ''}
                        onChange={(e) => {
                          const millions = parseFloat(e.target.value) || 0;
                          field.onChange(millions * 1000000);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    {field.value > 0 && (
                      <div className="text-sm text-muted-foreground">
                        = {field.value.toLocaleString()} GP
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={depositForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Admin deposit..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDepositForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={depositMutation.isPending}>
                  {depositMutation.isPending ? "Processing..." : "Deposit"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawForm} onOpenChange={setShowWithdrawForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Funds from Wallet</DialogTitle>
          </DialogHeader>
          <Form {...withdrawalForm}>
            <form onSubmit={withdrawalForm.handleSubmit((data) => withdrawalMutation.mutate(data))} className="space-y-4">
              <FormField
                control={withdrawalForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={withdrawalForm.control}
                name="amountGp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (Millions GP)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="1"
                        placeholder="200"
                        value={field.value ? field.value / 1000000 : ''}
                        onChange={(e) => {
                          const millions = parseFloat(e.target.value) || 0;
                          field.onChange(millions * 1000000);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    {field.value > 0 && (
                      <div className="text-sm text-muted-foreground">
                        = {field.value.toLocaleString()} GP
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={withdrawalForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Admin withdrawal..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowWithdrawForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={withdrawalMutation.isPending}>
                  {withdrawalMutation.isPending ? "Processing..." : "Withdraw"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Credit Management Dialog */}
      <Dialog open={showCreditForm} onOpenChange={setShowCreditForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {creditOperation === 'add' ? 'Add Credits' : 'Remove Credits'} - {selectedWalletForCredit?.username}
            </DialogTitle>
          </DialogHeader>
          <Form {...creditForm}>
            <form onSubmit={creditForm.handleSubmit((data) => creditMutation.mutate(data))} className="space-y-4">
              <FormField
                control={creditForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (GP)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter amount" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                    {field.value > 0 && (
                      <div className="text-sm text-muted-foreground">
                        = {formatGp(field.value)}
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={creditForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder={`Admin ${creditOperation === 'add' ? 'credit addition' : 'credit removal'}...`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreditForm(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={creditMutation.isPending}
                  className={creditOperation === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {creditMutation.isPending ? "Processing..." : (creditOperation === 'add' ? 'Add Credits' : 'Remove Credits')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Rank Management Dialog */}
      <Dialog open={showRankForm} onOpenChange={setShowRankForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Rank - {selectedWalletForRank?.username}</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Set a manual rank to override automatic rank calculation
            </div>
          </DialogHeader>
          <Form {...rankForm}>
            <form onSubmit={rankForm.handleSubmit((data) => rankMutation.mutate(data))} className="space-y-4">
              <FormField
                control={rankForm.control}
                name="rank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Rank</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rank" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">🚫 No Manual Rank (Auto)</SelectItem>
                        <SelectItem value="IRON">🥉 IRON (1% discount)</SelectItem>
                        <SelectItem value="STEEL">⚪ STEEL (2% discount)</SelectItem>
                        <SelectItem value="BLACK">⚫ BLACK (4% discount)</SelectItem>
                        <SelectItem value="ADAMANT">🟢 ADAMANT (6% discount)</SelectItem>
                        <SelectItem value="RUNE">🔵 RUNE (8% discount)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <div className="text-sm text-muted-foreground">
                      Current spending: {formatGp(selectedWalletForRank?.totalSpentGp || 0)}
                    </div>
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowRankForm(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={rankMutation.isPending}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {rankMutation.isPending ? "Updating..." : "Update Rank"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
