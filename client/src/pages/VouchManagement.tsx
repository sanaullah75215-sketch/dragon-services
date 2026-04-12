import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Home, ArrowLeft, Shield, Users, TrendingUp, Eye, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";

type Vouch = {
  id: string;
  voucherUserId: string;
  voucherUsername: string;
  vouchedUserId: string;
  vouchedUsername: string;
  vouchType: string;
  isPositive: boolean;
  reason: string;
  serviceContext?: string;
  orderId?: string;
  isVerified: boolean;
  isActive: boolean;
  moderationNotes?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type VouchStats = {
  totalVouches: number;
  positiveVouches: number;
  negativeVouches: number;
  reputationScore: number;
  vouchesByType: Record<string, number>;
};

export default function VouchManagement() {
  const [selectedVouch, setSelectedVouch] = useState<Vouch | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [moderationNotes, setModerationNotes] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all vouches
  const { data: vouches = [], isLoading } = useQuery<Vouch[]>({
    queryKey: ['/api/vouches'],
  });

  // Update vouch mutation
  const updateVouchMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Vouch> }) => {
      const response = await apiRequest('PATCH', `/api/vouches/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vouches'] });
      toast({
        title: "Success",
        description: "Vouch updated successfully",
      });
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update vouch",
        variant: "destructive",
      });
    },
  });

  // Delete vouch mutation
  const deleteVouchMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/vouches/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vouches'] });
      toast({
        title: "Success",
        description: "Vouch deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete vouch",
        variant: "destructive",
      });
    },
  });

  // Filter vouches based on search term
  const filteredVouches = vouches.filter(vouch => 
    vouch.voucherUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vouch.vouchedUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vouch.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vouch.vouchType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const stats = {
    total: vouches.length,
    verified: vouches.filter(v => v.isVerified).length,
    positive: vouches.filter(v => v.isPositive).length,
    negative: vouches.filter(v => !v.isPositive).length,
    pending: vouches.filter(v => !v.isVerified).length,
  };

  const handleEditVouch = (vouch: Vouch) => {
    setSelectedVouch(vouch);
    setModerationNotes(vouch.moderationNotes || "");
    setIsVerified(vouch.isVerified);
    setIsActive(vouch.isActive);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedVouch) return;

    updateVouchMutation.mutate({
      id: selectedVouch.id,
      updates: {
        moderationNotes,
        isVerified,
        isActive,
        moderatedBy: 'admin',
        moderatedAt: new Date().toISOString(),
      },
    });
  };

  const getVouchTypeEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      quality: '⭐',
      trustworthy: '🛡️',
      reliable: '✅',
      communication: '💬',
      speed: '⚡',
    };
    return emojis[type] || '👍';
  };

  const getVouchTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      quality: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      trustworthy: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      reliable: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      communication: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      speed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading vouching system...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="h-8 w-8 text-orange-600" />
                🐲 Dragon Services - Vouch Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Moderate and manage user vouches and reputation system
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/management">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Management
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-orange-600">{stats.total}</CardTitle>
              <CardDescription>Total Vouches</CardDescription>
            </CardHeader>
            <CardContent>
              <Users className="h-6 w-6 text-orange-600" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-green-600">{stats.verified}</CardTitle>
              <CardDescription>Verified</CardDescription>
            </CardHeader>
            <CardContent>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-green-500">{stats.positive}</CardTitle>
              <CardDescription>Positive</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-red-500">{stats.negative}</CardTitle>
              <CardDescription>Negative</CardDescription>
            </CardHeader>
            <CardContent>
              <XCircle className="h-6 w-6 text-red-500" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-yellow-600">{stats.pending}</CardTitle>
              <CardDescription>Pending Review</CardDescription>
            </CardHeader>
            <CardContent>
              <Eye className="h-6 w-6 text-yellow-600" />
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Vouches</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search by username, reason, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        {/* Vouches Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vouches ({filteredVouches.length})</CardTitle>
            <CardDescription>
              All user vouches in the system - manage verification and moderation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredVouches.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No vouches found matching your search.' : 'No vouches available.'}
                </div>
              ) : (
                filteredVouches.map((vouch) => (
                  <div
                    key={vouch.id}
                    className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">
                            {vouch.isPositive ? '✅' : '❌'}
                          </span>
                          <Badge className={getVouchTypeColor(vouch.vouchType)}>
                            {getVouchTypeEmoji(vouch.vouchType)} {vouch.vouchType}
                          </Badge>
                          {vouch.isVerified && (
                            <Badge variant="secondary">
                              <Shield className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {!vouch.isActive && (
                            <Badge variant="destructive">
                              Hidden
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mb-2">
                          <span className="font-medium">{vouch.voucherUsername}</span>
                          <span className="text-gray-600 dark:text-gray-400"> vouched for </span>
                          <span className="font-medium">{vouch.vouchedUsername}</span>
                        </div>
                        
                        <p className="text-gray-700 dark:text-gray-300 mb-2 italic">
                          "{vouch.reason}"
                        </p>
                        
                        {vouch.moderationNotes && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-sm">
                            <strong>Moderation Notes:</strong> {vouch.moderationNotes}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                          <span>Created: {new Date(vouch.createdAt).toLocaleDateString()}</span>
                          {vouch.moderatedBy && (
                            <span>Moderated by: {vouch.moderatedBy}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditVouch(vouch)}
                          data-testid={`button-edit-${vouch.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteVouchMutation.mutate(vouch.id)}
                          data-testid={`button-delete-${vouch.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Vouch</DialogTitle>
              <DialogDescription>
                Moderate this vouch - verify, add notes, or hide if inappropriate.
              </DialogDescription>
            </DialogHeader>
            
            {selectedVouch && (
              <div className="space-y-4">
                <div>
                  <Label>Vouch Details</Label>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                    <p><strong>From:</strong> {selectedVouch.voucherUsername}</p>
                    <p><strong>For:</strong> {selectedVouch.vouchedUsername}</p>
                    <p><strong>Type:</strong> {selectedVouch.vouchType}</p>
                    <p><strong>Reason:</strong> "{selectedVouch.reason}"</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="verified"
                    checked={isVerified}
                    onCheckedChange={setIsVerified}
                  />
                  <Label htmlFor="verified">Mark as Verified</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="active">Show Publicly</Label>
                </div>
                
                <div>
                  <Label htmlFor="notes">Moderation Notes</Label>
                  <Textarea
                    id="notes"
                    value={moderationNotes}
                    onChange={(e) => setModerationNotes(e.target.value)}
                    placeholder="Add internal notes about this vouch..."
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateVouchMutation.isPending}>
                {updateVouchMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}