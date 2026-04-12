import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Clock, Package, DollarSign, User, Calendar, Eye, CheckCircle2, XCircle, AlertCircle, Shield, Flame, Crown, Swords, Trash2, RefreshCw } from "lucide-react";
import { Link } from "wouter";

interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  username: string;
  status: string;
  paymentStatus: string;
  totalAmountGp: number;
  originalAmountGp: number;
  discountApplied: number;
  discountAmountGp: number;
  customerRank: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  statusHistory?: StatusHistory[];
}

interface OrderItem {
  id: string;
  orderId: string;
  serviceType: string;
  serviceName: string;
  description: string;
  quantity: number;
  unitPriceGp: number;
  totalPriceGp: number;
  status: string;
  configuration: any;
  createdAt: string;
}

interface StatusHistory {
  id: string;
  orderId: string;
  orderItemId?: string;
  previousStatus: string | null;
  newStatus: string;
  updatedBy: string;
  updatedByUsername: string;
  notes?: string;
  isSystemUpdate: boolean;
  createdAt: string;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'outline';
    case 'confirmed':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'completed':
      return 'default';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'confirmed':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'in_progress':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'completed':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'cancelled':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'confirmed':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'in_progress':
      return <AlertCircle className="h-4 w-4" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const OrderDetailsDialog = ({ order }: { order: Order }) => {
  const [statusUpdate, setStatusUpdate] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const { toast } = useToast();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string, status: string, notes?: string }) => {
      return apiRequest("PUT", `/api/orders/${orderId}/status`, {
        status,
        updatedBy: "admin",
        updatedByUsername: "Admin",
        notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully.",
      });
      setStatusUpdate("");
      setStatusNotes("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = () => {
    if (!statusUpdate) return;
    
    updateStatusMutation.mutate({
      orderId: order.id,
      status: statusUpdate,
      notes: statusNotes || undefined
    });
  };

  return (
    <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-orange-900 via-red-900 to-orange-800 text-white border-2 border-orange-600/50" data-testid="dialog-order-details">
      <DialogHeader className="border-b border-orange-600/30 pb-4">
        <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-orange-100">
          <Shield className="h-8 w-8 text-orange-400" />
          🐲 Dragon Services Order Details
          <Flame className="h-6 w-6 text-orange-400 animate-pulse" />
        </DialogTitle>
        <DialogDescription className="text-orange-200 text-lg">
          Premium order management and elite service tracking for {order.orderNumber}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Order Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-r from-orange-800/70 to-red-800/70 border-orange-600/50">
            <CardHeader className="pb-3 border-b border-orange-600/30">
              <CardTitle className="text-lg text-orange-100 flex items-center gap-2">
                <User className="h-5 w-5 text-orange-400" />
                Dragon Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex justify-between items-center bg-orange-900/30 rounded-lg p-3">
                <span className="font-medium text-orange-200">Status:</span>
                <Badge className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold ${getStatusColor(order.status)} border`}>
                  {getStatusIcon(order.status)}
                  {order.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between items-center bg-orange-900/30 rounded-lg p-3">
                <span className="font-medium text-orange-200">Payment:</span>
                <Badge className={`px-3 py-1 rounded-full font-semibold ${order.paymentStatus === 'paid' ? 'bg-green-600 text-green-100 border-green-500' : 'bg-yellow-600 text-yellow-100 border-yellow-500'}`}>
                  💰 {order.paymentStatus.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between items-center bg-orange-900/30 rounded-lg p-3">
                <span className="font-medium text-orange-200">Customer:</span>
                <span className="font-semibold text-orange-100">{order.username}</span>
              </div>
              <div className="flex justify-between items-center bg-orange-900/30 rounded-lg p-3">
                <span className="font-medium text-orange-200">Rank:</span>
                <span className="font-semibold text-orange-100 flex items-center gap-1">
                  <Crown className="h-4 w-4 text-orange-400" />
                  {order.customerRank || 'Standard'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-800/70 to-red-800/70 border-orange-600/50">
            <CardHeader className="pb-3 border-b border-orange-600/30">
              <CardTitle className="text-lg text-orange-100 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-400" />
                Dragon Service Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex justify-between items-center bg-orange-900/30 rounded-lg p-3">
                <span className="font-medium text-orange-200">Original Value:</span>
                <span className="font-semibold text-orange-100">{order.originalAmountGp.toLocaleString()} GP</span>
              </div>
              <div className="flex justify-between items-center bg-orange-900/30 rounded-lg p-3">
                <span className="font-medium text-orange-200">Discount ({order.discountApplied}%):</span>
                <span className="font-semibold text-green-400">-{order.discountAmountGp.toLocaleString()} GP</span>
              </div>
              <Separator className="bg-orange-600/50" />
              <div className="flex justify-between items-center bg-gradient-to-r from-orange-700/50 to-red-700/50 rounded-lg p-4 border border-orange-500/50">
                <span className="font-bold text-orange-100 text-lg">Premium Total:</span>
                <span className="font-bold text-orange-100 text-xl">{order.totalAmountGp.toLocaleString()} GP</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.serviceName}</h4>
                        <p className="text-sm text-gray-400">{item.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span>Qty: {item.quantity}</span>
                          <span>Unit: {item.unitPriceGp.toLocaleString()} GP</span>
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {item.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{item.totalPriceGp.toLocaleString()} GP</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Status Update */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status-select">New Status</Label>
                  <select
                    id="status-select"
                    className="w-full mt-1 p-2 border rounded-lg bg-background"
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value)}
                    data-testid="select-order-status"
                  >
                    <option value="">Select Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="status-notes">Notes (Optional)</Label>
                  <Textarea
                    id="status-notes"
                    placeholder="Add notes about this status change..."
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    className="mt-1"
                    data-testid="textarea-status-notes"
                  />
                </div>
              </div>
              <Button
                onClick={handleStatusUpdate}
                disabled={!statusUpdate || updateStatusMutation.isPending}
                data-testid="button-update-status"
              >
                {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status History */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.statusHistory.map((history) => (
                  <div key={history.id} className="border-l-2 border-gray-300 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {history.previousStatus ? `${history.previousStatus} → ${history.newStatus}` : history.newStatus}
                        </p>
                        <p className="text-sm text-gray-400">
                          By {history.updatedByUsername} • {new Date(history.createdAt).toLocaleString()}
                        </p>
                        {history.notes && (
                          <p className="text-sm mt-1">{history.notes}</p>
                        )}
                      </div>
                      {history.isSystemUpdate && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DialogContent>
  );
};

const DeleteOrderButton = ({ orderId, orderNumber }: { orderId: string, orderNumber: string }) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order Deleted",
        description: `Order ${orderNumber} has been permanently deleted.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete order.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (confirm(`🐲 Are you sure you want to permanently delete order ${orderNumber}?\n\nThis action cannot be undone and will remove all order data, items, and history.`)) {
      setIsDeleting(true);
      deleteOrderMutation.mutate();
    }
  };

  return (
    <Button
      onClick={handleDelete}
      disabled={deleteOrderMutation.isPending || isDeleting}
      size="sm"
      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border border-red-500 shadow-lg transition-all duration-200 w-full sm:w-auto"
      data-testid={`button-delete-order-${orderId}`}
    >
      {deleteOrderMutation.isPending ? (
        <>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Deleting...
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4 mr-2" />
          🗑️ Delete
        </>
      )}
    </Button>
  );
};

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  // Filter orders based on search term
  const filteredOrders = orders.filter((order: Order) =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-orange-800 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4 sm:space-y-6">
            <div className="bg-gradient-to-r from-orange-600/50 to-red-600/50 rounded-xl p-4 sm:p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 sm:gap-4">
                <Shield className="h-8 w-8 sm:h-12 sm:w-12 text-orange-300 animate-pulse" />
                <div>
                  <div className="h-6 sm:h-8 bg-orange-700/50 rounded w-48 sm:w-64 mb-2"></div>
                  <div className="h-3 sm:h-4 bg-orange-800/50 rounded w-32 sm:w-48"></div>
                </div>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 sm:h-32 bg-orange-800/50 rounded-lg border border-orange-600/30"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-orange-800 text-white p-4 sm:p-6">
      {/* Dragon Services Header */}
      <div className="max-w-6xl mx-auto mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 rounded-xl p-4 sm:p-6 shadow-2xl border border-orange-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Shield className="h-8 w-8 sm:h-12 sm:w-12 text-orange-200" />
              <div>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
                  🐲 Dragon Services
                  <Flame className="h-5 w-5 sm:h-8 sm:w-8 text-orange-300 animate-pulse" />
                </h1>
                <p className="text-orange-100 text-xs sm:text-base md:text-lg font-medium">
                  Elite OSRS Service Management Portal
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4 text-orange-100">
              <Crown className="h-6 w-6" />
              <span className="font-semibold">Premium Quality</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="bg-gradient-to-r from-orange-800/50 to-red-800/50 backdrop-blur-sm rounded-lg p-4 sm:p-6 shadow-lg border border-orange-600/30">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 sm:gap-3 text-orange-100">
              <Swords className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400" />
              Order Management Portal
            </h2>
            <p className="text-orange-200 mt-2 flex items-center gap-2 text-xs sm:text-sm">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
              Elite service tracking and premium customer management
            </p>
          </div>
          
          <div className="flex gap-2">
            <Link href="/create-order" className="flex-1 sm:flex-initial">
              <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold shadow-lg border border-orange-500 transition-all duration-200 w-full sm:w-auto" data-testid="button-create-order">
                <Flame className="h-4 w-4 mr-2" />
                Create Dragon Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="bg-gradient-to-r from-orange-800/80 to-red-800/80 border-orange-600/50 shadow-xl backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
              <div className="flex items-center gap-2 text-orange-200">
                <Swords className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold text-sm sm:text-base">Search Orders:</span>
              </div>
              <div className="flex-1">
                <Input
                  placeholder="🔍 Search by order number, customer, or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-orange-900/50 border-orange-600/50 text-white placeholder-orange-300 focus:border-orange-400 focus:ring-orange-400"
                  data-testid="input-search-orders"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card className="bg-gradient-to-r from-orange-800/60 to-red-800/60 border-orange-600/40 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Shield className="h-16 w-16 text-orange-400" />
                  <div>
                    <h3 className="text-2xl font-bold text-orange-100 mb-2 flex items-center gap-2 justify-center">
                      🐲 No Dragon Orders Found
                    </h3>
                    <p className="text-orange-200">
                      {searchTerm ? "No orders match your search criteria in the Dragon Services database." : "No premium orders have been placed yet."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order: Order) => (
              <Card key={order.id} className="bg-gradient-to-r from-orange-800/70 to-red-800/70 border-orange-600/50 shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                        <h3 className="text-base sm:text-xl font-bold text-orange-100 flex items-center gap-2">
                          🐲 {order.orderNumber}
                        </h3>
                        <Badge className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full font-semibold text-xs ${getStatusColor(order.status)} border`}>
                          {getStatusIcon(order.status)}
                          {order.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge className={`px-2 sm:px-3 py-1 rounded-full font-semibold text-xs ${order.paymentStatus === 'paid' ? 'bg-green-600 text-green-100 border-green-500' : 'bg-yellow-600 text-yellow-100 border-yellow-500'}`}>
                          💰 {order.paymentStatus.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 bg-orange-900/30 rounded-lg p-2 sm:p-3 border border-orange-700/50">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                          <div className="min-w-0">
                            <span className="text-orange-200 text-[10px] sm:text-xs font-medium">Customer</span>
                            <div className="text-orange-100 font-semibold truncate">{order.username}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-orange-900/30 rounded-lg p-2 sm:p-3 border border-orange-700/50">
                          <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                          <div className="min-w-0">
                            <span className="text-orange-200 text-[10px] sm:text-xs font-medium">Value</span>
                            <div className="text-orange-100 font-semibold truncate">{order.totalAmountGp.toLocaleString()} GP</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-orange-900/30 rounded-lg p-2 sm:p-3 border border-orange-700/50">
                          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                          <div className="min-w-0">
                            <span className="text-orange-200 text-[10px] sm:text-xs font-medium">Created</span>
                            <div className="text-orange-100 font-semibold truncate">{new Date(order.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-orange-900/30 rounded-lg p-2 sm:p-3 border border-orange-700/50">
                          <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                          <div className="min-w-0">
                            <span className="text-orange-200 text-[10px] sm:text-xs font-medium">Rank</span>
                            <div className="text-orange-100 font-semibold truncate">{order.customerRank || 'Standard'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border border-orange-500 shadow-lg transition-all duration-200 w-full sm:w-auto"
                            size="sm" 
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            🔍 View Details
                          </Button>
                        </DialogTrigger>
                        <OrderDetailsDialog order={order} />
                      </Dialog>
                      
                      <DeleteOrderButton orderId={order.id} orderNumber={order.orderNumber} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}