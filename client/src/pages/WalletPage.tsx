import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, Minus, CreditCard, DollarSign, Coins, History, TrendingUp, TrendingDown, Crown, ShoppingCart, Briefcase, Award } from 'lucide-react';
import type { UserWallet, WalletTransaction, PaymentMethod } from '@shared/schema';

export default function WalletPage() {
  const { toast } = useToast();
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');

  // For now using a default user - in production this would come from authentication
  const userId = "current-user";

  // Fetch user's vouch reputation stats
  const { data: reputationStats } = useQuery({
    queryKey: ['/api/vouches', userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/vouches/${userId}`);
        if (!response.ok) {
          return { stats: { totalVouches: 0, reputationScore: 0, positiveVouches: 0, negativeVouches: 0 } };
        }
        return response.json();
      } catch {
        return { stats: { totalVouches: 0, reputationScore: 0, positiveVouches: 0, negativeVouches: 0 } };
      }
    },
    retry: false,
  });

  // Fetch user wallet
  const { data: wallet, isLoading: walletLoading } = useQuery<UserWallet>({
    queryKey: ['/api/wallets', userId],
    queryFn: async () => {
      const response = await fetch(`/api/wallets/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch wallet');
      }
      return response.json();
    },
    retry: false,
  });

  // Fetch wallet transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<WalletTransaction[]>({
    queryKey: ['/api/wallets', userId, 'transactions'],
    queryFn: async () => {
      const response = await fetch(`/api/wallets/${userId}/transactions`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
    retry: false,
  });

  // Create wallet if it doesn't exist
  const createWalletMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/wallets', {
        userId: userId,
        username: 'User',
        userType: 'customer', // Default to customer
        balanceGp: 0,
        balanceUsd: '0.00',
        totalDeposited: '0.00',
        totalSpent: '0.00',
        totalEarnings: '0.00',
        completedJobs: 0,
        totalOrders: 0,
        customerRank: '0.00'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallets', userId] });
      toast({ title: 'Success', description: 'Wallet created successfully!' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create wallet', variant: 'destructive' });
    },
  });

  const formatGPAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount));
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (walletLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Wallet className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-gray-300">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Wallet className="h-16 w-16 mx-auto mb-4 text-gray-500" />
            <h2 className="text-2xl font-bold mb-2 text-white">No Wallet Found</h2>
            <p className="text-gray-400 mb-6">
              You don't have a wallet yet. Create one to start managing your Dragon Services account!
            </p>
            <Button 
              onClick={() => createWalletMutation.mutate()} 
              disabled={createWalletMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createWalletMutation.isPending ? 'Creating...' : 'Create Wallet'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is a worker or customer
  const isWorker = wallet.userType === 'worker';

  // Worker Wallet Design
  if (isWorker) {
    return (
      <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          {/* Worker Wallet Card */}
          <div className="bg-gray-800 rounded-lg border-l-4 border-blue-500 p-4 sm:p-6 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs sm:text-sm">🐲</span>
                </div>
                <span className="text-white font-semibold text-sm sm:text-base">Dragon Services</span>
              </div>
              <div className="text-right">
                <div className="text-yellow-400 font-bold text-sm sm:text-lg">OSRS</div>
                <div className="text-yellow-300 text-xs sm:text-sm">SERVICE</div>
                <div className="text-yellow-400 font-bold text-sm sm:text-lg">CAMP</div>
              </div>
            </div>

            {/* Worker Name */}
            <h2 className="text-white text-lg sm:text-xl font-semibold mb-1">
              {wallet.username}'s Wallet
            </h2>

            {/* Wallet Balance */}
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              <span className="text-gray-300 text-xs sm:text-sm">Wallet</span>
            </div>

            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {formatGPAmount(wallet.balanceGp)}
              </div>
            </div>

            {/* Worker Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-center">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 mb-1">
                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  <span className="text-gray-400 text-[10px] sm:text-xs">Deposit</span>
                </div>
                <div className="text-white font-semibold text-xs sm:text-sm">
                  {formatGPAmount(wallet.totalDepositedGp)}
                </div>
              </div>

              <div className="text-center">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 mb-1">
                  <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  <span className="text-gray-400 text-[10px] sm:text-xs">Jobs</span>
                </div>
                <div className="text-white font-semibold text-xs sm:text-sm">
                  {wallet.completedJobs}
                </div>
              </div>

              <div className="text-center">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 mb-1">
                  <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  <span className="text-gray-400 text-[10px] sm:text-xs">Earnings</span>
                </div>
                <div className="text-white font-semibold text-xs sm:text-sm">
                  {formatGPAmount(wallet.totalEarningsGp)}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-gray-500 text-[10px] sm:text-xs">
              Powered by X Tech • {getCurrentTime()}
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 sm:mt-6">
            <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Funds
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Add Funds</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Add money to your worker wallet for expenses.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="deposit-amount" className="text-gray-300">Amount (GP)</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      placeholder="5000000"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <Button 
                    onClick={() => setIsDepositDialogOpen(false)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Confirm Deposit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 w-full sm:w-auto">
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Customer Wallet Design
  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Customer Wallet Card */}
        <div className="bg-gray-800 rounded-lg border-l-4 border-teal-400 p-4 sm:p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">🐲</span>
              </div>
              <span className="text-white font-semibold text-sm sm:text-base">Dragon Services</span>
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-teal-400 rounded-lg flex items-center justify-center">
              {wallet.profileImageUrl ? (
                <img 
                  src={wallet.profileImageUrl} 
                  alt="Profile" 
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-sm sm:text-base">👤</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Name */}
          <h2 className="text-white text-lg sm:text-xl font-semibold mb-1">
            {wallet.username}'s Wallet
          </h2>

          {/* Wallet Balance */}
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            <span className="text-gray-300 text-xs sm:text-sm">Wallet</span>
          </div>

          <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {formatGPAmount(wallet.balanceGp)}
            </div>
          </div>

          {/* Customer Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 mb-1">
                <Award className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                <span className="text-gray-400 text-[10px] sm:text-xs">RANK</span>
              </div>
              <div className="text-white font-semibold text-xs sm:text-sm">
                {wallet.customerRank}%
              </div>
            </div>

            <div className="text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 mb-1">
                <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                <span className="text-gray-400 text-[10px] sm:text-xs">Orders</span>
              </div>
              <div className="text-white font-semibold text-xs sm:text-sm">
                {wallet.totalOrders}
              </div>
            </div>

            <div className="text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 mb-1">
                <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                <span className="text-gray-400 text-[10px] sm:text-xs">Spent</span>
              </div>
              <div className="text-white font-semibold text-xs sm:text-sm">
                {formatGPAmount(wallet.totalSpentGp)}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-gray-500 text-[10px] sm:text-xs">
            Powered by X Tech • {getCurrentTime()}
          </div>
        </div>


        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 sm:mt-6">
          <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" data-testid="button-add-funds">
                <Plus className="h-4 w-4 mr-2" />
                Add Funds
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 max-w-[90vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Add Funds</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Add money to your wallet to purchase services.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deposit-amount" className="text-gray-300">Amount (GP)</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="5000000"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    data-testid="input-deposit-amount"
                  />
                </div>
                <Button 
                  onClick={() => setIsDepositDialogOpen(false)}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="button-confirm-deposit"
                >
                  Confirm Deposit
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 w-full sm:w-auto" data-testid="button-view-history">
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>

          <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 w-full sm:w-auto" data-testid="button-browse-services">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Browse Services
          </Button>
        </div>
      </div>
    </div>
  );
}