import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, Minus, Search, Edit, Trash2, DollarSign, Users, TrendingUp, Crown, Filter, Download, Calendar } from 'lucide-react';
import type { UserWallet, WalletTransaction } from '@shared/schema';

export default function AdminWalletManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  // Form states
  const [editForm, setEditForm] = useState({
    username: '',
    balanceGp: '',
    customerRank: '',
    userType: 'customer'
  });

  // Fetch all wallets
  const { data: wallets = [], isLoading: walletsLoading } = useQuery<UserWallet[]>({
    queryKey: ['/api/wallets'],
    queryFn: async () => {
      const response = await fetch('/api/wallets');
      if (!response.ok) {
        throw new Error('Failed to fetch wallets');
      }
      return response.json();
    },
  });

  // Create wallet mutation
  const createWalletMutation = useMutation({
    mutationFn: async (walletData: any) => {
      return apiRequest('POST', '/api/wallets', walletData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
      setIsCreateDialogOpen(false);
      toast({ title: 'Success', description: 'Wallet created successfully!' });
      setEditForm({ username: '', balanceGp: '', customerRank: '', userType: 'customer' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create wallet', variant: 'destructive' });
    },
  });

  // Update wallet mutation
  const updateWalletMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest('PUT', `/api/wallets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
      setIsEditDialogOpen(false);
      toast({ title: 'Success', description: 'Wallet updated successfully!' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update wallet', variant: 'destructive' });
    },
  });

  // Delete wallet mutation
  const deleteWalletMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/wallets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
      toast({ title: 'Success', description: 'Wallet deleted successfully!' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete wallet', variant: 'destructive' });
    },
  });

  const formatGPAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toLocaleString();
  };

  const getRankBadge = (rank: string) => {
    const rankNum = parseFloat(rank) || 0;
    if (rankNum >= 8) return <Badge className="bg-purple-600">RUNE</Badge>;
    if (rankNum >= 6) return <Badge className="bg-blue-600">ADAMANT</Badge>;
    if (rankNum >= 4) return <Badge className="bg-green-600">MITHRIL</Badge>;
    if (rankNum >= 2) return <Badge className="bg-yellow-600">STEEL</Badge>;
    return <Badge className="bg-gray-600">IRON</Badge>;
  };

  const handleEditWallet = (wallet: UserWallet) => {
    setSelectedWallet(wallet);
    setEditForm({
      username: wallet.username,
      balanceGp: wallet.balanceGp.toString(),
      customerRank: (wallet.customerRank || '0').toString(),
      userType: wallet.userType || 'customer'
    });
    setIsEditDialogOpen(true);
  };

  const handleCreateWallet = () => {
    createWalletMutation.mutate({
      userId: `user_${Date.now()}`,
      username: editForm.username,
      userType: editForm.userType,
      balanceGp: parseInt(editForm.balanceGp) || 0,
      totalDepositedGp: 0,
      totalSpentGp: 0,
      totalEarningsGp: 0,
      completedJobs: 0,
      totalOrders: 0,
      customerRank: editForm.customerRank,
      isActive: true
    });
  };

  const handleUpdateWallet = () => {
    if (!selectedWallet) return;
    
    updateWalletMutation.mutate({
      id: selectedWallet.id,
      data: {
        username: editForm.username,
        balanceGp: parseInt(editForm.balanceGp) || 0,
        customerRank: editForm.customerRank,
        userType: editForm.userType
      }
    });
  };

  const handleExport = async (type: 'wallets' | 'transactions') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
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
        title: 'Export Complete',
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

  // Filter wallets based on search and type
  const filteredWallets = wallets.filter(wallet => {
    const matchesSearch = wallet.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wallet.userId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'customer' && wallet.userType === 'customer') ||
                         (filterType === 'worker' && wallet.userType === 'worker') ||
                         (filterType === 'high-value' && wallet.balanceGp >= 10000000);
    
    return matchesSearch && matchesFilter;
  });

  // Calculate totals
  const totalBalance = wallets.reduce((sum, wallet) => sum + (wallet.balanceGp || 0), 0);
  const totalUsers = wallets.length;
  const activeWallets = wallets.filter(w => w.balanceGp > 0).length;

  if (walletsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Wallet className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-gray-300">Loading wallet management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">💰 Admin Wallet Management</h1>
          <p className="text-gray-400">Manage all user wallets and transactions</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{totalUsers}</div>
              <p className="text-gray-400 text-sm">{activeWallets} active wallets</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{formatGPAmount(totalBalance)} GP</div>
              <p className="text-gray-400 text-sm">Across all wallets</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Active Wallets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{activeWallets}</div>
              <p className="text-gray-400 text-sm">{((activeWallets / totalUsers) * 100).toFixed(1)}% of total</p>
            </CardContent>
          </Card>
        </div>

        {/* Excel Export Section */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Download className="h-5 w-5" />
              🐲 Export Data to Excel
            </CardTitle>
            <CardDescription className="text-gray-400">
              Download wallet and transaction data as Excel files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex gap-4 flex-1">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="startDate" className="text-gray-300 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Start Date
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white w-40"
                    data-testid="input-start-date"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="endDate" className="text-gray-300 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    End Date
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white w-40"
                    data-testid="input-end-date"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleExport('wallets')}
                  disabled={isExporting}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-export-wallets"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export Wallets'}
                </Button>
                <Button
                  onClick={() => handleExport('transactions')}
                  disabled={isExporting}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-export-transactions"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export Transactions'}
                </Button>
              </div>
            </div>
            <p className="text-gray-500 text-sm mt-3">
              Leave dates empty to export all data. Set date range to filter by creation date.
            </p>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by username or user ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="all">All Wallets</SelectItem>
                    <SelectItem value="customer">Customers</SelectItem>
                    <SelectItem value="worker">Workers</SelectItem>
                    <SelectItem value="high-value">High Value (10M+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Wallet
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create New Wallet</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Create a new wallet for a user.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="create-username" className="text-gray-300">Username</Label>
                      <Input
                        id="create-username"
                        placeholder="Enter username"
                        value={editForm.username}
                        onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-balance" className="text-gray-300">Initial Balance (GP)</Label>
                      <Input
                        id="create-balance"
                        type="number"
                        placeholder="0"
                        value={editForm.balanceGp}
                        onChange={(e) => setEditForm({...editForm, balanceGp: e.target.value})}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-type" className="text-gray-300">User Type</Label>
                      <Select value={editForm.userType} onValueChange={(value) => setEditForm({...editForm, userType: value})}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="worker">Worker</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleCreateWallet}
                      disabled={createWalletMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {createWalletMutation.isPending ? 'Creating...' : 'Create Wallet'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Wallets Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">User Wallets ({filteredWallets.length})</CardTitle>
            <CardDescription className="text-gray-400">
              Manage user balances, ranks, and wallet settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300">Balance</TableHead>
                    <TableHead className="text-gray-300">Rank</TableHead>
                    <TableHead className="text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-300">Orders</TableHead>
                    <TableHead className="text-gray-300">Total Spent</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWallets.map((wallet) => (
                    <TableRow key={wallet.id} className="border-gray-700 hover:bg-gray-750">
                      <TableCell className="text-white">
                        <div>
                          <div className="font-medium">{wallet.username}</div>
                          <div className="text-xs text-gray-400">{wallet.userId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-green-400 font-mono">
                        {formatGPAmount(wallet.balanceGp)} GP
                      </TableCell>
                      <TableCell>
                        {getRankBadge(wallet.customerRank || '0')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={wallet.userType === 'worker' ? 'default' : 'secondary'}>
                          {wallet.userType || 'customer'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">{wallet.totalOrders || 0}</TableCell>
                      <TableCell className="text-yellow-400 font-mono">
                        {formatGPAmount(wallet.totalSpentGp || 0)} GP
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditWallet(wallet)}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteWalletMutation.mutate(wallet.id)}
                            className="border-red-600 text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Wallet</DialogTitle>
              <DialogDescription className="text-gray-400">
                Modify wallet details for {selectedWallet?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-username" className="text-gray-300">Username</Label>
                <Input
                  id="edit-username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-balance" className="text-gray-300">Balance (GP)</Label>
                <Input
                  id="edit-balance"
                  type="number"
                  value={editForm.balanceGp}
                  onChange={(e) => setEditForm({...editForm, balanceGp: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-rank" className="text-gray-300">Customer Rank (%)</Label>
                <Input
                  id="edit-rank"
                  type="number"
                  step="0.1"
                  value={editForm.customerRank}
                  onChange={(e) => setEditForm({...editForm, customerRank: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-type" className="text-gray-300">User Type</Label>
                <Select value={editForm.userType} onValueChange={(value) => setEditForm({...editForm, userType: value})}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="worker">Worker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleUpdateWallet}
                disabled={updateWalletMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {updateWalletMutation.isPending ? 'Updating...' : 'Update Wallet'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}