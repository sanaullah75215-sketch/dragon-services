import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit2, Trash2, DollarSign, Calendar, Percent, Zap, Gift, X, Eye } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { SpecialOffer, InsertSpecialOffer } from '@shared/schema';

export default function SpecialOffersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch special offers
  const { data: offers = [], isLoading } = useQuery<SpecialOffer[]>({
    queryKey: ['/api/offers'],
  });

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (offer: InsertSpecialOffer) => {
      return apiRequest('POST', '/api/offers', offer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      setIsCreateDialogOpen(false);
      toast({ title: 'Success', description: 'Offer created successfully!' });
    },
  });

  // Update offer mutation
  const updateOfferMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SpecialOffer> }) => {
      return apiRequest('PATCH', `/api/offers/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      setEditingOffer(null);
      toast({ title: 'Success', description: 'Offer updated successfully!' });
    },
  });

  // Delete offer mutation
  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/offers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      toast({ title: 'Success', description: 'Offer deleted successfully!' });
    },
  });

  const getOfferTypeIcon = (offerType: string) => {
    switch (offerType) {
      case 'flash': return <Zap className="h-4 w-4" />;
      case 'weekly': return <Calendar className="h-4 w-4" />;
      case 'limited': return <Gift className="h-4 w-4" />;
      case 'seasonal': return <Gift className="h-4 w-4" />;
      default: return <Gift className="h-4 w-4" />;
    }
  };

  const getOfferTypeColor = (offerType: string) => {
    switch (offerType) {
      case 'flash': return 'bg-orange-500';
      case 'weekly': return 'bg-green-500';
      case 'limited': return 'bg-pink-500';
      case 'seasonal': return 'bg-purple-500';
      default: return 'bg-blue-500';
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'skilling': return '⚒️';
      case 'questing': return '📜';
      case 'ironman_gathering': return '⛏️';
      case 'bossing': return '⚔️';
      case 'achievements': return '🏆';
      case 'pet_hunting': return '🐉';
      default: return '💎';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'skilling': return 'Skilling';
      case 'questing': return 'Questing';
      case 'ironman_gathering': return 'Ironman Gathering';
      case 'bossing': return 'Bossing';
      case 'achievements': return 'Achievements';
      case 'pet_hunting': return 'Pet Hunting';
      default: return 'Other';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Loading special offers...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8" data-testid="special-offers-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Special Offers Management</h1>
          <p className="text-muted-foreground">Create and manage promotional offers for Discord bot</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-offer">
              <Plus className="h-4 w-4 mr-2" />
              Create Offer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <OfferForm 
              onSubmit={(data) => createOfferMutation.mutate(data)}
              isLoading={createOfferMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(offers as SpecialOffer[]).map((offer: SpecialOffer) => (
          <Card key={offer.id} className="relative" data-testid={`card-offer-${offer.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={`${getOfferTypeColor(offer.offerType)} text-white`}>
                    {getOfferTypeIcon(offer.offerType)}
                    <span className="ml-1">{offer.offerType.toUpperCase()}</span>
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
                    <span>{getCategoryEmoji(offer.category)} {getCategoryName(offer.category)}</span>
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={offer.isActive || false}
                    onCheckedChange={(checked) => 
                      updateOfferMutation.mutate({ 
                        id: offer.id, 
                        updates: { isActive: checked } 
                      })
                    }
                    data-testid={`switch-active-${offer.id}`}
                  />
                </div>
              </div>
              <CardTitle className="text-lg" data-testid={`text-title-${offer.id}`}>{offer.title}</CardTitle>
              <CardDescription data-testid={`text-description-${offer.id}`}>{offer.description}</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-2 text-sm">
                {offer.discountPercentage && (
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-green-500" />
                    <span data-testid={`text-discount-${offer.id}`}>{offer.discountPercentage}% OFF</span>
                  </div>
                )}
                {offer.originalPrice && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="line-through text-muted-foreground">{offer.originalPrice}</span>
                  </div>
                )}
                {offer.salePrice && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-green-500" data-testid={`text-price-${offer.id}`}>{offer.salePrice}</span>
                  </div>
                )}
                {offer.expiresAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <span className="text-orange-500">
                      Expires: {new Date(offer.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid={`button-edit-${offer.id}`}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <OfferForm 
                    offer={offer}
                    onSubmit={(data) => updateOfferMutation.mutate({ id: offer.id, updates: data })}
                    isLoading={updateOfferMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => deleteOfferMutation.mutate(offer.id)}
                disabled={deleteOfferMutation.isPending}
                data-testid={`button-delete-${offer.id}`}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {offers.length === 0 && (
        <div className="text-center py-12">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No special offers yet</h3>
          <p className="text-muted-foreground mb-4">Create your first promotional offer to get started.</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Offer
          </Button>
        </div>
      )}
    </div>
  );
}

interface OfferFormProps {
  offer?: SpecialOffer;
  onSubmit: (data: InsertSpecialOffer) => void;
  isLoading?: boolean;
}

type DiscountItem = {
  serviceName: string;
  originalPrice: string;
  salePrice: string;
};

function OfferForm({ offer, onSubmit, isLoading }: OfferFormProps) {
  const [formData, setFormData] = useState({
    title: offer?.title || '',
    description: offer?.description || '',
    category: offer?.category || 'skilling',
    discountPercentage: offer?.discountPercentage || 0,
    discountAmount: offer?.discountAmount || '',
    originalPrice: offer?.originalPrice || '',
    salePrice: offer?.salePrice || '',
    offerType: offer?.offerType || 'flash',
    expiresAt: offer?.expiresAt ? new Date(offer.expiresAt).toISOString().split('T')[0] : '',
    imageUrl: offer?.imageUrl || '',
    isActive: Boolean(offer?.isActive ?? true),
  });
  
  const [items, setItems] = useState<DiscountItem[]>(
    offer?.items && (offer.items as any).length > 0 
      ? (offer.items as DiscountItem[])
      : []
  );
  
  const addItem = () => {
    setItems([...items, { serviceName: '', originalPrice: '', salePrice: '' }]);
  };
  
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const updateItem = (index: number, field: keyof DiscountItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate sale price for items when original price changes
    if (field === 'originalPrice' && formData.discountPercentage) {
      const calculated = calculateSalePrice(value, formData.discountPercentage);
      if (calculated) {
        newItems[index].salePrice = calculated;
      }
    }
    
    setItems(newItems);
  };

  // Auto-calculate sale price based on percentage and original price
  const calculateSalePrice = (originalPrice: string, discountPercentage: number) => {
    const price = parseFloat(originalPrice.replace(/[^0-9.]/g, ''));
    if (isNaN(price) || !discountPercentage || discountPercentage <= 0) return '';
    
    const discount = (price * discountPercentage) / 100;
    const salePrice = price - discount;
    
    // Return in the same format as input (e.g., "500M GP")
    const unit = originalPrice.match(/[A-Z]+/gi)?.[0] || 'M';
    const suffix = originalPrice.includes('GP') ? ' GP' : '';
    return `${salePrice}${unit}${suffix}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      items: items.length > 0 ? items : undefined,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
    };
    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(submitData).filter(([_, v]) => v !== undefined && v !== '')
    );
    onSubmit(cleanedData as InsertSpecialOffer);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
      <DialogHeader className="flex-shrink-0">
        <DialogTitle>{offer ? 'Edit Offer' : 'Create New Offer'}</DialogTitle>
        <DialogDescription>
          Set up a special promotional offer that will appear in Discord.
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="flex-1 pr-4 my-4">
        <div className="grid gap-4 pb-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="🔥 Flash Sale: Fire Cape Package"
            required
            data-testid="input-title"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Get your Fire Cape completed by our expert team!"
            required
            data-testid="input-description"
          />
        </div>

        <div>
          <Label htmlFor="category">Service Category</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger data-testid="select-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skilling">⚒️ Skilling</SelectItem>
              <SelectItem value="questing">📜 Questing</SelectItem>
              <SelectItem value="ironman_gathering">⛏️ Ironman Gathering</SelectItem>
              <SelectItem value="bossing">⚔️ Bossing</SelectItem>
              <SelectItem value="achievements">🏆 Achievements</SelectItem>
              <SelectItem value="pet_hunting">🐉 Pet Hunting</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Multiple Services (Optional)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              data-testid="button-add-item"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Service
            </Button>
          </div>
          
          {items.map((item, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Service #{index + 1}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  data-testid={`button-remove-item-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div>
                <Label htmlFor={`serviceName-${index}`} className="text-xs">Service Name</Label>
                <Input
                  id={`serviceName-${index}`}
                  value={item.serviceName}
                  onChange={(e) => updateItem(index, 'serviceName', e.target.value)}
                  placeholder="e.g., 1-99 Agility"
                  data-testid={`input-service-name-${index}`}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`originalPrice-${index}`} className="text-xs">Original Price</Label>
                  <Input
                    id={`originalPrice-${index}`}
                    value={item.originalPrice}
                    onChange={(e) => updateItem(index, 'originalPrice', e.target.value)}
                    placeholder="500M GP"
                    data-testid={`input-original-price-${index}`}
                  />
                </div>
                <div>
                  <Label htmlFor={`salePrice-${index}`} className="text-xs">
                    Sale Price {formData.discountPercentage > 0 && <span className="text-green-500">(Auto)</span>}
                  </Label>
                  <Input
                    id={`salePrice-${index}`}
                    value={item.salePrice}
                    onChange={(e) => updateItem(index, 'salePrice', e.target.value)}
                    placeholder="450M GP"
                    data-testid={`input-sale-price-${index}`}
                  />
                </div>
              </div>
            </div>
          ))}
          
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Click "Add Service" to add multiple services with individual prices
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="offerType">Offer Type</Label>
            <Select 
              value={formData.offerType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, offerType: value }))}
            >
              <SelectTrigger data-testid="select-offer-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flash">⚡ Flash Sale</SelectItem>
                <SelectItem value="weekly">📅 Weekly Deal</SelectItem>
                <SelectItem value="limited">🔥 Limited Time</SelectItem>
                <SelectItem value="seasonal">🎄 Seasonal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="discountPercentage">Discount %</Label>
            <Input
              id="discountPercentage"
              type="number"
              value={formData.discountPercentage}
              onChange={(e) => {
                const percentage = parseInt(e.target.value) || 0;
                setFormData(prev => ({ ...prev, discountPercentage: percentage }));
                
                // Auto-calculate sale price if original price exists
                if (formData.originalPrice && percentage > 0) {
                  const calculated = calculateSalePrice(formData.originalPrice, percentage);
                  if (calculated) {
                    setFormData(prev => ({ ...prev, salePrice: calculated }));
                  }
                }
                
                // Auto-calculate for all items
                if (items.length > 0 && percentage > 0) {
                  const updatedItems = items.map(item => {
                    if (item.originalPrice) {
                      const calculated = calculateSalePrice(item.originalPrice, percentage);
                      return { ...item, salePrice: calculated || item.salePrice };
                    }
                    return item;
                  });
                  setItems(updatedItems);
                }
              }}
              placeholder="25"
              min="0"
              max="100"
              data-testid="input-discount-percentage"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="originalPrice">Original Price</Label>
            <Input
              id="originalPrice"
              value={formData.originalPrice}
              onChange={(e) => {
                const price = e.target.value;
                setFormData(prev => ({ ...prev, originalPrice: price }));
                
                // Auto-calculate sale price if discount percentage exists
                if (formData.discountPercentage && formData.discountPercentage > 0) {
                  const calculated = calculateSalePrice(price, formData.discountPercentage);
                  if (calculated) {
                    setFormData(prev => ({ ...prev, salePrice: calculated }));
                  }
                }
              }}
              placeholder="40M GP"
              data-testid="input-original-price"
            />
          </div>

          <div>
            <Label htmlFor="salePrice">Sale Price {formData.discountPercentage > 0 && <span className="text-xs text-green-500">(Auto-calculated)</span>}</Label>
            <Input
              id="salePrice"
              value={formData.salePrice}
              onChange={(e) => setFormData(prev => ({ ...prev, salePrice: e.target.value }))}
              placeholder="24M GP"
              data-testid="input-sale-price"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="expiresAt">Expires At</Label>
          <Input
            id="expiresAt"
            type="date"
            value={formData.expiresAt}
            onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
            data-testid="input-expires-at"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: Boolean(checked) }))}
            data-testid="switch-is-active"
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
        </div>
      </ScrollArea>

      <DialogFooter className="flex-shrink-0">
        <Button type="submit" disabled={isLoading} data-testid="button-submit">
          {isLoading ? 'Saving...' : (offer ? 'Update Offer' : 'Create Offer')}
        </Button>
      </DialogFooter>
    </form>
  );
}