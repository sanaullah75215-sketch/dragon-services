import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Minus, Trash2, DollarSign, User, Package, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "wouter";

interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  options: ServiceOption[] | null;
}

interface ServiceOption {
  id: string;
  name: string;
  description: string;
  price: number;
  duration?: string;
}

interface UserWallet {
  id: string;
  userId: string;
  username: string;
  balanceGp: number;
  totalSpentGp: number;
  totalDepositedGp: number;
  customerRank: string;
  manualRank?: string;
}

interface OrderItem {
  serviceType: string;
  serviceId: string;
  serviceName: string;
  description: string;
  unitPriceGp: number;
  quantity: number;
  configuration: any;
}

interface CustomerRank {
  name: string;
  color: string;
  discount: number;
  minSpent: number;
}

export default function CreateOrderPage() {
  const [, setLocation] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWallet | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Fetch services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['/api/services'],
  });

  // Fetch users for selection
  const { data: users = [] } = useQuery<UserWallet[]>({
    queryKey: ['/api/admin/users/search', searchQuery],
    enabled: searchQuery.length > 2,
  });

  // Import rank utilities
  const getCustomerRank = (totalSpent: number, manualRank?: string): CustomerRank => {
    // This would normally be imported from @shared/ranks
    const ranks = [
      { name: 'IRON', color: '#8B4513', discount: 1, minSpent: 0 },
      { name: 'BRONZE', color: '#CD7F32', discount: 2, minSpent: 50000 },
      { name: 'SILVER', color: '#C0C0C0', discount: 4, minSpent: 150000 },
      { name: 'GOLD', color: '#FFD700', discount: 6, minSpent: 500000 },
      { name: 'RUNE', color: '#4169E1', discount: 8, minSpent: 1000000 }
    ];
    
    if (manualRank) {
      return ranks.find(r => r.name === manualRank) || ranks[0];
    }
    
    return ranks.reverse().find(r => totalSpent >= r.minSpent) || ranks[0];
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: (order: any) => {
      toast({
        title: "Order Created Successfully",
        description: `Order ${order.orderNumber} has been created and is pending payment.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setLocation('/orders');
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Order",
        description: error.message || "Failed to create order.",
        variant: "destructive",
      });
    },
  });

  const handleUserSelect = (user: UserWallet) => {
    setSelectedUser(user);
    setSelectedUserId(user.userId);
    setSearchQuery("");
  };

  const addServiceToOrder = (service: Service, option?: ServiceOption) => {
    const price = option?.price || 1000; // Default price if no option
    const description = option ? `${service.name} - ${option.name}` : service.name;
    
    const newItem: OrderItem = {
      serviceType: service.category,
      serviceId: service.id,
      serviceName: service.name,
      description,
      unitPriceGp: price,
      quantity: 1,
      configuration: option ? { optionId: option.id, optionName: option.name } : {}
    };

    setOrderItems(prev => [...prev, newItem]);
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeOrderItem(index);
      return;
    }
    
    setOrderItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const originalTotal = orderItems.reduce((sum, item) => 
      sum + (item.unitPriceGp * item.quantity), 0
    );
    
    if (!selectedUser) {
      return { originalTotal, discountPercentage: 0, discountAmount: 0, finalTotal: originalTotal };
    }
    
    const rank = getCustomerRank(selectedUser.totalSpentGp, selectedUser.manualRank);
    const discountPercentage = rank.discount;
    const discountAmount = Math.floor(originalTotal * (discountPercentage / 100));
    const finalTotal = originalTotal - discountAmount;
    
    return { originalTotal, discountPercentage, discountAmount, finalTotal, rank };
  };

  const handleCreateOrder = () => {
    if (!selectedUser || orderItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a user and add at least one service.",
        variant: "destructive",
      });
      return;
    }

    const { finalTotal } = calculateTotals();
    
    if (selectedUser.balanceGp < finalTotal) {
      toast({
        title: "Insufficient Balance",
        description: `User needs ${finalTotal.toLocaleString()} GP but only has ${selectedUser.balanceGp.toLocaleString()} GP.`,
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate({
      userId: selectedUser.userId,
      username: selectedUser.username,
      items: orderItems,
      notes: orderNotes || undefined
    });
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Link href="/orders">
            <Button variant="outline" size="sm" data-testid="button-back-orders" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8" />
              Create New Order
            </h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              Create a new order for a customer
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - User Selection & Services */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* User Selection */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  Select Customer
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Search and select the customer for this order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                {!selectedUser ? (
                  <div>
                    <Label htmlFor="user-search" className="text-sm">Search by username or user ID</Label>
                    <Input
                      id="user-search"
                      placeholder="Start typing to search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-gray-700 border-gray-600 mt-1"
                      data-testid="input-user-search"
                    />
                    
                    {users.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto border border-gray-600 rounded-lg">
                        {users.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleUserSelect(user)}
                            className="w-full p-2 sm:p-3 text-left hover:bg-gray-700 border-b border-gray-600 last:border-b-0"
                            data-testid={`button-select-user-${user.userId}`}
                          >
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm sm:text-base truncate">{user.username}</p>
                                <p className="text-xs sm:text-sm text-gray-400 truncate">{user.userId}</p>
                              </div>
                              <div className="sm:text-right flex sm:flex-col gap-2 sm:gap-0 items-center sm:items-end">
                                <p className="text-xs sm:text-sm flex-1 sm:flex-initial">{user.balanceGp.toLocaleString()} GP</p>
                                <Badge variant="outline" className="text-[10px] sm:text-xs">
                                  {user.customerRank}
                                </Badge>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-700 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm sm:text-base truncate">{selectedUser.username}</h3>
                      <p className="text-xs sm:text-sm text-gray-400">Balance: {selectedUser.balanceGp.toLocaleString()} GP</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {totals.rank?.name || selectedUser.customerRank} ({totals.rank?.discount || 0}% discount)
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedUser(null); setSelectedUserId(""); }}
                      data-testid="button-change-user"
                      className="w-full sm:w-auto"
                    >
                      Change User
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services Selection */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  Available Services
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Select services to add to the order
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {services.map((service) => (
                    <div key={service.id} className="border border-gray-600 rounded-lg p-3 sm:p-4">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="text-xl sm:text-2xl">{service.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm sm:text-base">{service.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-400 mb-3">{service.description}</p>
                          
                          {service.options && service.options.length > 0 ? (
                            <div className="space-y-2">
                              {service.options.map((option) => (
                                <div key={option.id} className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{option.name}</p>
                                    <p className="text-xs text-gray-400">{option.description}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{option.price?.toLocaleString()} GP</span>
                                    <Button
                                      size="sm"
                                      onClick={() => addServiceToOrder(service, option)}
                                      disabled={!selectedUser}
                                      data-testid={`button-add-service-${service.id}-${option.id}`}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Base service</span>
                              <Button
                                size="sm"
                                onClick={() => addServiceToOrder(service)}
                                disabled={!selectedUser}
                                data-testid={`button-add-service-${service.id}`}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-4 sm:space-y-6">
            {/* Order Items */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {orderItems.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-gray-400">
                    <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">No items added yet</p>
                    <p className="text-xs sm:text-sm">Select services to add to the order</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {orderItems.map((item, index) => (
                      <div key={index} className="border border-gray-600 rounded-lg p-2 sm:p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <h4 className="font-medium text-xs sm:text-sm truncate">{item.description}</h4>
                            <p className="text-[10px] sm:text-xs text-gray-400">{item.unitPriceGp.toLocaleString()} GP each</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOrderItem(index)}
                            data-testid={`button-remove-item-${index}`}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(index, item.quantity - 1)}
                            data-testid={`button-decrease-${index}`}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs sm:text-sm font-medium w-6 sm:w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                            data-testid={`button-increase-${index}`}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <div className="flex-1 text-right">
                            <span className="font-medium text-xs sm:text-sm">
                              {(item.unitPriceGp * item.quantity).toLocaleString()} GP
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            {orderItems.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span>Subtotal:</span>
                    <span>{totals.originalTotal.toLocaleString()} GP</span>
                  </div>
                  
                  {totals.discountPercentage > 0 && (
                    <div className="flex justify-between text-green-400 text-sm sm:text-base">
                      <span className="text-xs sm:text-sm">{totals.rank?.name} Discount ({totals.discountPercentage}%):</span>
                      <span>-{totals.discountAmount.toLocaleString()} GP</span>
                    </div>
                  )}
                  
                  <Separator />
                  <div className="flex justify-between font-bold text-base sm:text-lg">
                    <span>Total:</span>
                    <span>{totals.finalTotal.toLocaleString()} GP</span>
                  </div>
                  
                  {selectedUser && selectedUser.balanceGp < totals.finalTotal && (
                    <div className="p-2 sm:p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-400 text-xs sm:text-sm">
                        ⚠️ Insufficient balance! User needs {(totals.finalTotal - selectedUser.balanceGp).toLocaleString()} more GP.
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <Label htmlFor="order-notes">Order Notes (Optional)</Label>
                    <Textarea
                      id="order-notes"
                      placeholder="Add any special instructions or notes..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="bg-gray-700 border-gray-600 mt-1"
                      data-testid="textarea-order-notes"
                    />
                  </div>

                  <Button
                    onClick={handleCreateOrder}
                    disabled={!selectedUser || orderItems.length === 0 || (selectedUser && selectedUser.balanceGp < totals.finalTotal) || createOrderMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    data-testid="button-create-order"
                  >
                    {createOrderMutation.isPending ? (
                      "Creating Order..."
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Create Order
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}