import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, DollarSign, RefreshCw, TrendingUp, TrendingDown, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GpRate = {
  id: string;
  methodName: string;
  methodType: string;
  methodCategory: string;
  buyingRate: string | null;
  sellingRate: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
  lastUpdated: string;
};

type TrackerStatus = {
  isRunning: boolean;
  lastMarketPrice: number | null;
  lastSellRate: number | null;
  lastBuyRate: number | null;
  lastUpdated: string | null;
  source: string | null;
  channelId: string | null;
};

export default function GpRatesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<GpRate | null>(null);
  const [channelInput, setChannelInput] = useState("");
  const [formData, setFormData] = useState({
    methodName: "",
    methodType: "crypto",
    methodCategory: "both",
    buyingRate: "",
    sellingRate: "",
    icon: "",
    sortOrder: 0,
    isActive: true,
  });

  const { data: gpRates = [], isLoading } = useQuery<GpRate[]>({
    queryKey: ["/api/gp-rates"],
  });

  const { data: trackerStatus, isLoading: trackerLoading } = useQuery<TrackerStatus>({
    queryKey: ["/api/gp-tracker/status"],
    refetchInterval: 60_000,
  });

  const forceCheckMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/gp-tracker/check"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gp-tracker/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gp-rates"] });
      toast({ title: "✅ Price check complete", description: "Rates have been refreshed from the market." });
    },
    onError: (err: any) => {
      toast({ title: "Price check failed", description: err.message || "Bot may not be running.", variant: "destructive" });
    },
  });

  const saveChannelMutation = useMutation({
    mutationFn: async (channelId: string) => apiRequest("PUT", "/api/gp-tracker/config", { channelId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gp-tracker/status"] });
      toast({ title: "✅ Notify channel saved" });
      setChannelInput("");
    },
    onError: () => toast({ title: "Failed to save channel", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/gp-rates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gp-rates"] });
      toast({ title: "GP rate created successfully!" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: async (error: any) => {
      let errorMessage = "Failed to create GP rate";
      try {
        const errorData = await error.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Use default error message
      }
      toast({ title: errorMessage, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/gp-rates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gp-rates"] });
      toast({ title: "GP rate updated successfully!" });
      setIsDialogOpen(false);
      resetForm();
      setEditingRate(null);
    },
    onError: async (error: any) => {
      let errorMessage = "Failed to update GP rate";
      try {
        const errorData = await error.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Use default error message
      }
      toast({ title: errorMessage, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/gp-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gp-rates"] });
      toast({ title: "GP rate deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete GP rate", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/gp-rates/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gp-rates"] });
      toast({ title: "GP rate status updated!" });
    },
  });

  const resetForm = () => {
    setFormData({
      methodName: "",
      methodType: "crypto",
      methodCategory: "both",
      buyingRate: "",
      sellingRate: "",
      icon: "",
      sortOrder: 0,
      isActive: true,
    });
  };

  const handleEdit = (rate: GpRate) => {
    setEditingRate(rate);
    setFormData({
      methodName: rate.methodName,
      methodType: rate.methodType,
      methodCategory: rate.methodCategory,
      buyingRate: rate.buyingRate || "",
      sellingRate: rate.sellingRate || "",
      icon: rate.icon || "",
      sortOrder: rate.sortOrder,
      isActive: rate.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submissionData = {
      ...formData,
      buyingRate: formData.buyingRate || null,
      sellingRate: formData.sellingRate || null,
      sortOrder: typeof formData.sortOrder === 'string' ? parseInt(formData.sortOrder) || 0 : formData.sortOrder,
    };
    
    if (editingRate) {
      updateMutation.mutate({ id: editingRate.id, data: submissionData });
    } else {
      createMutation.mutate(submissionData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this GP rate?")) {
      deleteMutation.mutate(id);
    }
  };

  const cryptoRates = gpRates.filter((r) => r.methodType === "crypto");
  const nonCryptoRates = gpRates.filter((r) => r.methodType === "non_crypto");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2" data-testid="page-title-gprates">
              💰 GP Rates Management
            </h1>
            <p className="text-slate-300 text-sm sm:text-base">Manage OSRS GP buying and selling rates</p>
          </div>
          <Button
            onClick={() => {
              setEditingRate(null);
              resetForm();
              setIsDialogOpen(true);
            }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 w-full sm:w-auto"
            data-testid="button-add-rate"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Rate
          </Button>
        </div>

        {/* ── Auto GP Price Tracker Status ─────────────────────────────── */}
        <Card className="bg-slate-800/60 border-slate-600 mb-6">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Auto GP Price Tracker
              {trackerStatus?.isRunning
                ? <span className="ml-2 text-xs text-green-400 flex items-center gap-1"><Wifi className="w-3 h-3" /> Active</span>
                : <span className="ml-2 text-xs text-slate-400 flex items-center gap-1"><WifiOff className="w-3 h-3" /> Bot offline</span>}
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Scrapes Probemas every 30 min · sets sell rate = market&nbsp;−&nbsp;$0.01 · buy rate = sell&nbsp;−&nbsp;$0.04 (capped $0.16–$0.18)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                <div className="text-slate-400 text-xs mb-1">Market Price</div>
                <div className="text-white font-bold text-lg">
                  {trackerLoading ? "…" : trackerStatus?.lastMarketPrice ? `$${trackerStatus.lastMarketPrice.toFixed(4)}` : "N/A"}
                </div>
                <div className="text-slate-500 text-xs">{trackerStatus?.source || "—"}</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                <div className="text-slate-400 text-xs mb-1 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3 text-green-400" /> Our Sell</div>
                <div className="text-green-400 font-bold text-lg">
                  {trackerLoading ? "…" : trackerStatus?.lastSellRate ? `$${trackerStatus.lastSellRate.toFixed(4)}` : "N/A"}
                </div>
                <div className="text-slate-500 text-xs">/ M GP</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                <div className="text-slate-400 text-xs mb-1 flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3 text-red-400" /> Our Buy</div>
                <div className="text-red-400 font-bold text-lg">
                  {trackerLoading ? "…" : trackerStatus?.lastBuyRate ? `$${trackerStatus.lastBuyRate.toFixed(4)}` : "N/A"}
                </div>
                <div className="text-slate-500 text-xs">/ M GP</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                <div className="text-slate-400 text-xs mb-1">Last Updated</div>
                <div className="text-white font-bold text-sm">
                  {trackerStatus?.lastUpdated
                    ? new Date(trackerStatus.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "Never"}
                </div>
                <div className="text-slate-500 text-xs">
                  {trackerStatus?.lastUpdated
                    ? new Date(trackerStatus.lastUpdated).toLocaleDateString()
                    : "—"}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => forceCheckMutation.mutate()}
                disabled={forceCheckMutation.isPending}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${forceCheckMutation.isPending ? "animate-spin" : ""}`} />
                {forceCheckMutation.isPending ? "Checking…" : "Force Price Check Now"}
              </Button>

              <div className="flex gap-2 flex-1">
                <Input
                  placeholder={trackerStatus?.channelId ? `Current: ${trackerStatus.channelId}` : "Discord channel ID for notifications"}
                  value={channelInput}
                  onChange={e => setChannelInput(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 text-sm h-9"
                />
                <Button
                  onClick={() => saveChannelMutation.mutate(channelInput)}
                  disabled={!channelInput || saveChannelMutation.isPending}
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0"
                >
                  Set Channel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-white text-center py-12">Loading GP rates...</div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Cryptocurrency Rates */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                  <DollarSign className="w-4 w-4 sm:w-5 sm:h-5" />
                  Cryptocurrency Methods
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs sm:text-sm">
                  Bitcoin, Ethereum, USDT, and other crypto payment methods
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid gap-3 sm:gap-4">
                  {cryptoRates.map((rate) => (
                    <div
                      key={rate.id}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-slate-700/30 rounded-lg border border-slate-600 ${
                        !rate.isActive ? 'opacity-50' : ''
                      }`}
                      data-testid={`rate-card-${rate.id}`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <span className="text-2xl sm:text-3xl flex-shrink-0">{rate.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-white font-semibold text-sm sm:text-base truncate">{rate.methodName}</h3>
                            {!rate.isActive && (
                              <span className="px-2 py-0.5 text-[10px] sm:text-xs bg-red-500/20 text-red-300 rounded border border-red-500/30 flex-shrink-0">
                                Disabled
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-slate-400">
                            {rate.buyingRate && (
                              <span>Buy: ${rate.buyingRate}/M</span>
                            )}
                            {rate.sellingRate && (
                              <span>Sell: ${rate.sellingRate}/M</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end sm:justify-start">
                        <Switch
                          checked={rate.isActive}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: rate.id, isActive: checked })
                          }
                          data-testid={`toggle-active-${rate.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rate)}
                          data-testid={`button-edit-${rate.id}`}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rate.id)}
                          data-testid={`button-delete-${rate.id}`}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Non-Cryptocurrency Rates */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                  <DollarSign className="w-4 w-4 sm:w-5 sm:h-5" />
                  Traditional Payment Methods
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs sm:text-sm">
                  Payoneer, Venmo, Zelle, and other non-crypto methods
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid gap-3 sm:gap-4">
                  {nonCryptoRates.map((rate) => (
                    <div
                      key={rate.id}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-slate-700/30 rounded-lg border border-slate-600 ${
                        !rate.isActive ? 'opacity-50' : ''
                      }`}
                      data-testid={`rate-card-${rate.id}`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <span className="text-2xl sm:text-3xl flex-shrink-0">{rate.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-white font-semibold text-sm sm:text-base truncate">{rate.methodName}</h3>
                            {!rate.isActive && (
                              <span className="px-2 py-0.5 text-[10px] sm:text-xs bg-red-500/20 text-red-300 rounded border border-red-500/30 flex-shrink-0">
                                Disabled
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-slate-400">
                            {rate.buyingRate && (
                              <span>Buy: ${rate.buyingRate}/M</span>
                            )}
                            {rate.sellingRate && (
                              <span>Sell: ${rate.sellingRate}/M</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end sm:justify-start">
                        <Switch
                          checked={rate.isActive}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: rate.id, isActive: checked })
                          }
                          data-testid={`toggle-active-${rate.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rate)}
                          data-testid={`button-edit-${rate.id}`}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rate.id)}
                          data-testid={`button-delete-${rate.id}`}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>
                {editingRate ? "Edit GP Rate" : "Add New GP Rate"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {editingRate
                  ? "Update the GP rate details"
                  : "Create a new payment method for GP trading"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="methodName">Payment Method Name</Label>
                <Input
                  id="methodName"
                  value={formData.methodName}
                  onChange={(e) =>
                    setFormData({ ...formData, methodName: e.target.value })
                  }
                  placeholder="e.g., Bitcoin, Payoneer"
                  required
                  data-testid="input-methodname"
                  className="bg-slate-700 border-slate-600"
                />
              </div>

              <div>
                <Label htmlFor="icon">Icon (Emoji)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g., ₿, 💳, 💰"
                  data-testid="input-icon"
                  className="bg-slate-700 border-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="methodType">Method Type</Label>
                  <Select
                    value={formData.methodType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, methodType: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600" data-testid="select-methodtype">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="non_crypto">Non-Crypto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="methodCategory">Available For</Label>
                  <Select
                    value={formData.methodCategory}
                    onValueChange={(value) =>
                      setFormData({ ...formData, methodCategory: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600" data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Buying & Selling</SelectItem>
                      <SelectItem value="buying">Buying Only</SelectItem>
                      <SelectItem value="selling">Selling Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buyingRate">Buying Rate ($/M)</Label>
                  <Input
                    id="buyingRate"
                    type="number"
                    step="0.001"
                    value={formData.buyingRate}
                    onChange={(e) =>
                      setFormData({ ...formData, buyingRate: e.target.value })
                    }
                    placeholder="0.155"
                    data-testid="input-buyingrate"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>

                <div>
                  <Label htmlFor="sellingRate">Selling Rate ($/M)</Label>
                  <Input
                    id="sellingRate"
                    type="number"
                    step="0.001"
                    value={formData.sellingRate}
                    onChange={(e) =>
                      setFormData({ ...formData, sellingRate: e.target.value })
                    }
                    placeholder="0.110"
                    data-testid="input-sellingrate"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                  data-testid="input-sortorder"
                  className="bg-slate-700 border-slate-600"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                  data-testid="toggle-isactive"
                />
                <Label htmlFor="isActive">Active (visible to users)</Label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                  className="border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  data-testid="button-submit"
                >
                  {editingRate ? "Update Rate" : "Create Rate"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
