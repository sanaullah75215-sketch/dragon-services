import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Edit, Plus, Trash2, DollarSign } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface Quest {
  id: string;
  name: string;
  category: string;
  description: string;
  requirements: string;
  icon: string;
  isActive: boolean;
}

interface QuestPricing {
  id: string;
  questId: string;
  serviceType: string;
  price: string;
  duration: string;
  description: string;
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

  // Fetch quests
  const { data: quests = [] } = useQuery<Quest[]>({
    queryKey: ['/api/quests'],
  });

  // Fetch quest pricing
  const { data: questPricing = [], isLoading } = useQuery<QuestPricing[]>({
    queryKey: ['/api/quest-pricing'],
  });

  // Quest mutations
  const createQuestMutation = useMutation({
    mutationFn: async (questData: Partial<Quest>) => {
      const response = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questData),
      });
      if (!response.ok) throw new Error('Failed to create quest');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quests'] });
      setIsQuestDialogOpen(false);
      setEditingQuest(null);
      toast({ title: "Quest created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create quest", variant: "destructive" });
    },
  });

  const updateQuestMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Quest> & { id: string }) => {
      const response = await fetch(`/api/quests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update quest');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quests'] });
      setIsQuestDialogOpen(false);
      setEditingQuest(null);
      toast({ title: "Quest updated successfully!" });
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
      toast({ title: "Quest deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete quest", variant: "destructive" });
    },
  });

  // Quest pricing mutations
  const createPricingMutation = useMutation({
    mutationFn: async (pricingData: Partial<QuestPricing>) => {
      const response = await fetch('/api/quest-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricingData),
      });
      if (!response.ok) throw new Error('Failed to create pricing');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quest-pricing'] });
      setIsPricingDialogOpen(false);
      setEditingPricing(null);
      toast({ title: "Quest pricing created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create quest pricing", variant: "destructive" });
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<QuestPricing> & { id: string }) => {
      const response = await fetch(`/api/quest-pricing/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update pricing');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quest-pricing'] });
      setIsPricingDialogOpen(false);
      setEditingPricing(null);
      toast({ title: "Quest pricing updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update quest pricing", variant: "destructive" });
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
      toast({ title: "Quest pricing deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete quest pricing", variant: "destructive" });
    },
  });

  const handleQuestSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const questData = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      description: formData.get('description') as string,
      requirements: formData.get('requirements') as string,
      icon: formData.get('icon') as string,
      isActive: true,
    };

    if (editingQuest) {
      updateQuestMutation.mutate({ ...questData, id: editingQuest.id });
    } else {
      createQuestMutation.mutate(questData);
    }
  };

  const handlePricingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rawPrice = formData.get('price') as string;
    const pricingData = {
      questId: formData.get('questId') as string,
      serviceType: formData.get('serviceType') as string,
      price: parsePriceInput(rawPrice),
      duration: formData.get('duration') as string,
      description: formData.get('description') as string,
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      isActive: true,
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

  const getQuestName = (questId: string) => {
    const quest = quests.find(s => s.id === questId);
    return quest?.name || 'Unknown Quest';
  };

  // Helper functions for M format
  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (numPrice >= 1000000) {
      return `${(numPrice / 1000000).toFixed(1)}M GP`;
    } else if (numPrice >= 1000) {
      return `${(numPrice / 1000).toFixed(1)}K GP`;
    } else {
      return `${numPrice} GP`;
    }
  };

  const parsePriceInput = (input: string) => {
    const cleaned = input.toLowerCase().trim();
    if (cleaned.includes('m')) {
      const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
      return (num * 1000000).toString();
    } else if (cleaned.includes('k')) {
      const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
      return (num * 1000).toString();
    } else {
      return cleaned.replace(/[^0-9.]/g, '');
    }
  };

  const displayPriceForEdit = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (numPrice >= 1000000) {
      return `${(numPrice / 1000000)}M`;
    } else if (numPrice >= 1000) {
      return `${(numPrice / 1000)}K`;
    } else {
      return numPrice.toString();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Quest Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quest Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              🗡️ Quests
              <Dialog open={isQuestDialogOpen} onOpenChange={setIsQuestDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingQuest(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Quest
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingQuest ? 'Edit Quest' : 'Add New Quest'}</DialogTitle>
                    <DialogDescription>
                      Create or edit quest definitions that can be used in the calculator.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleQuestSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Quest Name</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        placeholder="e.g., Cooking Assistant"
                        defaultValue={editingQuest?.name || ''} 
                        required 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select name="category" defaultValue={editingQuest?.category} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="novice">Novice</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="experienced">Experienced</SelectItem>
                          <SelectItem value="master">Master</SelectItem>
                          <SelectItem value="grandmaster">Grandmaster</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="icon">Icon/Emoji</Label>
                      <Input 
                        id="icon" 
                        name="icon" 
                        placeholder="🗡️" 
                        defaultValue={editingQuest?.icon || ''} 
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        placeholder="Quest description..."
                        defaultValue={editingQuest?.description || ''} 
                      />
                    </div>

                    <div>
                      <Label htmlFor="requirements">Requirements</Label>
                      <Textarea 
                        id="requirements" 
                        name="requirements" 
                        placeholder="Quest requirements..."
                        defaultValue={editingQuest?.requirements || ''} 
                      />
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={createQuestMutation.isPending || updateQuestMutation.isPending}>
                        {editingQuest ? 'Update' : 'Create'} Quest
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>
              Manage OSRS quest definitions for the calculator
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quests.map((quest) => (
                <div key={quest.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{quest.icon}</span>
                    <div>
                      <div className="font-medium">{quest.name}</div>
                      <Badge variant="outline" className="text-xs">
                        {quest.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingQuest(quest);
                        setIsQuestDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteQuestMutation.mutate(quest.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quest Pricing Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              💰 Quest Pricing
              <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingPricing(null)}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Add Pricing
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingPricing ? 'Edit Quest Pricing' : 'Add Quest Pricing'}</DialogTitle>
                    <DialogDescription>
                      Set pricing for quest completion services.
                    </DialogDescription>
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
                              {quest.icon} {quest.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="serviceType">Service Type</Label>
                      <Input 
                        id="serviceType" 
                        name="serviceType" 
                        placeholder="e.g., Standard, Express, VIP"
                        defaultValue={editingPricing?.serviceType || ''} 
                        required 
                      />
                    </div>

                    <div>
                      <Label htmlFor="price">Price (GP)</Label>
                      <Input 
                        id="price" 
                        name="price" 
                        placeholder="e.g., 5M or 500K or 5000000"
                        defaultValue={editingPricing ? displayPriceForEdit(editingPricing.price) : ''} 
                        required 
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        You can use M for millions (5M = 5,000,000) or K for thousands (500K = 500,000)
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="duration">Duration</Label>
                      <Input 
                        id="duration" 
                        name="duration" 
                        placeholder="e.g., 1-2 hours"
                        defaultValue={editingPricing?.duration || ''} 
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        placeholder="Service description..."
                        defaultValue={editingPricing?.description || ''} 
                      />
                    </div>

                    <div>
                      <Label htmlFor="sortOrder">Sort Order</Label>
                      <Input 
                        id="sortOrder" 
                        name="sortOrder" 
                        type="number" 
                        placeholder="0"
                        defaultValue={editingPricing?.sortOrder || 0} 
                      />
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={createPricingMutation.isPending || updatePricingMutation.isPending}>
                        {editingPricing ? 'Update' : 'Create'} Pricing
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>
              Set pricing for quest completion services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label htmlFor="quest-filter">Filter by Quest</Label>
              <Select value={selectedQuest} onValueChange={setSelectedQuest}>
                <SelectTrigger>
                  <SelectValue placeholder="All quests" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All quests</SelectItem>
                  {quests.map((quest) => (
                    <SelectItem key={quest.id} value={quest.id}>
                      {quest.icon} {quest.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {filteredPricing.map((pricing) => (
                <div key={pricing.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{getQuestName(pricing.questId)} - {pricing.serviceType}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatPrice(pricing.price)} • {pricing.duration}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPricing(pricing);
                        setIsPricingDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deletePricingMutation.mutate(pricing.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}