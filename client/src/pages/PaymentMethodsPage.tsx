import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, CreditCard, Copy, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PaymentMethod = {
  id: string;
  name: string;
  displayName: string;
  type: string;
  icon: string | null;
  description: string | null;
  address: string | null;
  minAmount: string | null;
  maxAmount: string | null;
  feePercentage: string | null;
  feeFixed: string | null;
  isActive: boolean;
  isDepositEnabled: boolean;
  isWithdrawalEnabled: boolean;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
};

export default function PaymentMethodsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    type: "crypto",
    icon: "",
    description: "",
    address: "",
    feePercentage: "0",
    feeFixed: "0",
    sortOrder: 0,
    isActive: true,
  });

  const { data: paymentMethods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/payment-methods", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Payment method created successfully!" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: async (error: any) => {
      let errorMessage = "Failed to create payment method";
      try {
        const errorData = await error.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {}
      toast({ title: errorMessage, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/payment-methods/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Payment method updated successfully!" });
      setIsDialogOpen(false);
      resetForm();
      setEditingMethod(null);
    },
    onError: async (error: any) => {
      let errorMessage = "Failed to update payment method";
      try {
        const errorData = await error.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {}
      toast({ title: errorMessage, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/payment-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Payment method deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete payment method", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/payment-methods/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Payment method status updated!" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      type: "crypto",
      icon: "",
      description: "",
      address: "",
      feePercentage: "0",
      feeFixed: "0",
      sortOrder: 0,
      isActive: true,
    });
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      displayName: method.displayName,
      type: method.type,
      icon: method.icon || "",
      description: method.description || "",
      address: method.address || "",
      feePercentage: method.feePercentage || "0",
      feeFixed: method.feeFixed || "0",
      sortOrder: method.sortOrder || 0,
      isActive: method.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submissionData = {
      ...formData,
      sortOrder: typeof formData.sortOrder === 'string' ? parseInt(formData.sortOrder) || 0 : formData.sortOrder,
    };
    
    if (editingMethod) {
      updateMutation.mutate({ id: editingMethod.id, data: submissionData });
    } else {
      createMutation.mutate(submissionData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this payment method?")) {
      deleteMutation.mutate(id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const cryptoMethods = paymentMethods.filter((m) => m.type === "crypto");
  const fiatMethods = paymentMethods.filter((m) => m.type === "fiat");
  const otherMethods = paymentMethods.filter((m) => m.type !== "crypto" && m.type !== "fiat");

  const getTypeEmoji = (type: string) => {
    if (type === "crypto") return "🪙";
    if (type === "fiat") return "💳";
    return "💰";
  };

  const renderMethodCard = (method: PaymentMethod) => (
    <Card 
      key={method.id} 
      className={`${!method.isActive ? 'opacity-50' : ''}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getTypeEmoji(method.type)}</span>
            <CardTitle className="text-lg">{method.displayName}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!method.isActive && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">Disabled</span>
            )}
            <Switch
              checked={method.isActive}
              onCheckedChange={(checked) =>
                toggleActiveMutation.mutate({ id: method.id, isActive: checked })
              }
            />
          </div>
        </div>
        <CardDescription>{method.description || 'No description'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Address / Email / ID</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 bg-muted px-2 py-1 rounded text-sm break-all">
                {method.address || 'Not configured'}
              </code>
              {method.address && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(method.address!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Type: {method.type}</span>
            <span>Order: {method.sortOrder}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(method)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(method.id)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/management">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <CreditCard className="h-8 w-8" />
                Payment Methods
              </h1>
              <p className="text-muted-foreground">
                Manage payment addresses for the !payment command
              </p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setEditingMethod(null); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </div>

        {cryptoMethods.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              🪙 Cryptocurrency ({cryptoMethods.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cryptoMethods.map(renderMethodCard)}
            </div>
          </div>
        )}

        {fiatMethods.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              💳 Traditional ({fiatMethods.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fiatMethods.map(renderMethodCard)}
            </div>
          </div>
        )}

        {otherMethods.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              💰 Other ({otherMethods.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {otherMethods.map(renderMethodCard)}
            </div>
          </div>
        )}

        {paymentMethods.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payment methods yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first payment method to get started
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
              </DialogTitle>
              <DialogDescription>
                Configure the payment method details shown to customers
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Internal Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="bitcoin"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Bitcoin (BTC)"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Payment Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crypto">🪙 Cryptocurrency</SelectItem>
                    <SelectItem value="fiat">💳 Traditional (Fiat)</SelectItem>
                    <SelectItem value="other">💰 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address / Email / ID</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter wallet address, email, or ID"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  This is what customers will see and copy to send payment
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Fast and secure crypto payment"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="feePercentage">Fee %</Label>
                  <Input
                    id="feePercentage"
                    type="number"
                    step="0.01"
                    value={formData.feePercentage}
                    onChange={(e) => setFormData({ ...formData, feePercentage: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active (shown to customers)</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingMethod ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
