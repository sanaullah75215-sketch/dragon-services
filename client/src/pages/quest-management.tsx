import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Edit, Plus, Trash2, DollarSign } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface Quest {
  id: string;
  name: string;
  isActive: boolean;
}

interface QuestPricing {
  id: string;
  questId: string;
  serviceType: string;
  price: string;
  isActive: boolean;
  sortOrder: number;
}

export default function QuestManagement() {
  const { toast } = useToast();
  const [selectedQuest, setSelectedQuest] = useState<string>("");
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [editingPricing, setEditingPricing] = useState<QuestPricing | null>(null);
  const [isQuestDialogOpen, setIsQuestDialogOpen] = useState(false);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);

  const { data: quests = [] } = useQuery<Quest[]>({ queryKey: ['/api/quests'] });
  const { data: questPricing = [] } = useQuery<QuestPricing[]>({ queryKey: ['/api/quest-pricing'] });

  // Quest mutations
  const createQuestMutation = useMutation({
    mutationFn: async (questData: { name: string }) => {
      const response = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...questData, isActive: true }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create quest');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quests'] });
      setIsQuestDialogOpen(false);
      setEditingQuest(null);
      toast({ title: "Quest added!" });
    },
    onError: (e: any) => {
      toast({ title: e.message || "Failed to add quest", variant: "destructive" });
    },
  });

  const updateQuestMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await fetch(`/api/quests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed to update quest');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quests'] });
      setIsQuestDialogOpen(false);
      setEditingQuest(null);
      toast({ title: "Quest updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update quest", variant: "destructive" });
    },
  });

  const deleteQuestMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/quests/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete quest');
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quest-pricing'] });
      toast({ title: "Quest deleted!" });
    },
    onError: () => {
      toast({ title: "Failed to delete quest", variant: "destructive" });
    },
  });

  // Quest pricing mutations
  const createPricingMutation = useMutation({
    mutationFn: async (pricingData: { questId: string; price: string; serviceType: string }) => {
      const response = await fetch('/api/quest-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pricingData, isActive: true }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create pricing');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quest-pricing'] });
      setIsPricingDialogOpen(false);
      setEditingPricing(null);
      toast({ title: "Price added!" });
    },
    onError: (e: any) => {
      toast({ title: e.message || "Failed to add price", variant: "destructive" });
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: async ({ id, questId, price, serviceType }: { id: string; questId: string; price: string; serviceType: string }) => {
      const response = await fetch(`/api/quest-pricing/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, price, serviceType }),
      });
      if (!response.ok) throw new Error('Failed to update pricing');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quest-pricing'] });
      setIsPricingDialogOpen(false);
      setEditingPricing(null);
      toast({ title: "Price updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update price", variant: "destructive" });
    },
  });

  const deletePricingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/quest-pricing/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete pricing');
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quest-pricing'] });
      toast({ title: "Price deleted!" });
    },
    onError: () => {
      toast({ title: "Failed to delete price", variant: "destructive" });
    },
  });

  const handleQuestSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    if (!name) return;
    if (editingQuest) {
      updateQuestMutation.mutate({ id: editingQuest.id, name });
    } else {
      createQuestMutation.mutate({ name });
    }
  };

  const parsePriceInput = (input: string): string => {
    const cleaned = input.toLowerCase().trim();
    if (cleaned.includes('b')) {
      return (parseFloat(cleaned.replace(/[^0-9.]/g, '')) * 1000000000).toString();
    } else if (cleaned.includes('m')) {
      return (parseFloat(cleaned.replace(/[^0-9.]/g, '')) * 1000000).toString();
    } else if (cleaned.includes('k')) {
      return (parseFloat(cleaned.replace(/[^0-9.]/g, '')) * 1000).toString();
    }
    return cleaned.replace(/[^0-9.]/g, '');
  };

  const formatPrice = (price: string | number): string => {
    const n = typeof price === 'string' ? parseFloat(price) : price;
    if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B GP`;
    if (n >= 1000000)    return `${(n / 1000000).toFixed(1)}M GP`;
    if (n >= 1000)       return `${(n / 1000).toFixed(1)}K GP`;
    return `${n} GP`;
  };

  const displayPriceForEdit = (price: string | number): string => {
    const n = typeof price === 'string' ? parseFloat(price) : price;
    if (n >= 1000000000) return `${n / 1000000000}B`;
    if (n >= 1000000)    return `${n / 1000000}M`;
    if (n >= 1000)       return `${n / 1000}K`;
    return n.toString();
  };

  const handlePricingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const questId = formData.get('questId') as string;
    const rawPrice = formData.get('price') as string;
    if (!questId || !rawPrice) return;
    const pricingData = {
      questId,
      price: parsePriceInput(rawPrice),
      serviceType: 'Standard',
    };
    if (editingPricing) {
      updatePricingMutation.mutate({ ...pricingData, id: editingPricing.id });
    } else {
      createPricingMutation.mutate(pricingData);
    }
  };

  const filteredPricing = selectedQuest && selectedQuest !== 'all'
    ? questPricing.filter(p => p.questId === selectedQuest)
    : questPricing;

  const getQuestName = (questId: string) => quests.find(q => q.id === questId)?.name || 'Unknown Quest';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Quest Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              ⚔️ Quests
              <Dialog open={isQuestDialogOpen} onOpenChange={(open) => {
                setIsQuestDialogOpen(open);
                if (!open) setEditingQuest(null);
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingQuest(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Quest
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingQuest ? 'Edit Quest' : 'Add Quest'}</DialogTitle>
                    <DialogDescription>Enter the quest name to add it to the calculator.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleQuestSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Quest Name</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="e.g., Dragon Slayer II"
                        defaultValue={editingQuest?.name || ''}
                        required
                        autoFocus
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createQuestMutation.isPending || updateQuestMutation.isPending}>
                        {editingQuest ? 'Update' : 'Add'} Quest
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>Quests available in the !q calculator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quests.map((quest) => (
                <div key={quest.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{quest.name}</span>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingQuest(quest);
                      setIsQuestDialogOpen(true);
                    }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteQuestMutation.mutate(quest.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {quests.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No quests added yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quest Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              💰 Quest Pricing
              <Dialog open={isPricingDialogOpen} onOpenChange={(open) => {
                setIsPricingDialogOpen(open);
                if (!open) setEditingPricing(null);
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingPricing(null)}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Add Price
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingPricing ? 'Edit Price' : 'Add Price'}</DialogTitle>
                    <DialogDescription>Select the quest and set its price.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePricingSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="questId">Quest</Label>
                      <Select name="questId" defaultValue={editingPricing?.questId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select quest" />
                        </SelectTrigger>
                        <SelectContent>
                          {quests.map((quest) => (
                            <SelectItem key={quest.id} value={quest.id}>
                              {quest.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        name="price"
                        placeholder="e.g., 50M or 1.5B"
                        defaultValue={editingPricing ? displayPriceForEdit(editingPricing.price) : ''}
                        required
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground mt-1">Use M for millions, B for billions (e.g. 50M, 1.5B)</p>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createPricingMutation.isPending || updatePricingMutation.isPending}>
                        {editingPricing ? 'Update' : 'Add'} Price
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>Set prices that show up in !q calculator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Select value={selectedQuest} onValueChange={setSelectedQuest}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by quest..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All quests</SelectItem>
                  {quests.map((quest) => (
                    <SelectItem key={quest.id} value={quest.id}>
                      {quest.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {filteredPricing.map((pricing) => (
                <div key={pricing.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{getQuestName(pricing.questId)}</div>
                    <div className="text-sm text-muted-foreground">{formatPrice(pricing.price)}</div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingPricing(pricing);
                      setIsPricingDialogOpen(true);
                    }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deletePricingMutation.mutate(pricing.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredPricing.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No prices added yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
