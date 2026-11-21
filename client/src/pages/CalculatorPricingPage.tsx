import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Swords, Calculator } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { CalculatorPricing, InsertCalculatorPricing } from '@shared/schema';

const TYPE_META: Record<string, { label: string; command: string; unitHint: string; defaultUnit: string }> = {
  boss: { label: 'Bosses', command: '!b', unitHint: 'per kill', defaultUnit: 'per_kill' },
  item: { label: 'Items', command: '!im', unitHint: 'each (flat)', defaultUnit: 'flat' },
  minigame: { label: 'Minigames', command: '!m', unitHint: 'per point or flat', defaultUnit: 'flat' },
};

const UNIT_LABELS: Record<string, string> = {
  per_kill: 'Per kill',
  flat: 'Flat (one-off)',
  per_point: 'Per point',
};

const EMPTY_FORM: InsertCalculatorPricing = {
  type: 'boss',
  name: '',
  aliases: '',
  unit: 'per_kill',
  priceGp: '0',
  description: '',
  duration: '',
  isActive: true,
  sortOrder: 0,
};

export default function CalculatorPricingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CalculatorPricing | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<InsertCalculatorPricing>({ ...EMPTY_FORM });

  const { data: items = [], isLoading } = useQuery<CalculatorPricing[]>({
    queryKey: ['/api/calculator-pricing/all'],
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/calculator-pricing/all'] });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCalculatorPricing) => apiRequest('POST', '/api/calculator-pricing', data),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast({ title: '✅ Price added' });
    },
    onError: () => toast({ title: 'Failed to add price', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CalculatorPricing> }) =>
      apiRequest('PATCH', `/api/calculator-pricing/${id}`, updates),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast({ title: '✅ Price updated' });
    },
    onError: () => toast({ title: 'Failed to update price', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/calculator-pricing/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: '🗑️ Price deleted' });
    },
    onError: () => toast({ title: 'Failed to delete price', variant: 'destructive' }),
  });

  const openCreate = (type: string) => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, type, unit: TYPE_META[type].defaultUnit });
    setDialogOpen(true);
  };

  const openEdit = (item: CalculatorPricing) => {
    setEditing(item);
    setForm({
      type: item.type,
      name: item.name,
      aliases: item.aliases ?? '',
      unit: item.unit,
      priceGp: String(item.priceGp),
      description: item.description ?? '',
      duration: item.duration ?? '',
      isActive: item.isActive ?? true,
      sortOrder: item.sortOrder ?? 0,
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim() || !form.priceGp || parseFloat(form.priceGp) <= 0) {
      toast({ title: 'Name and a price above 0 GP are required', variant: 'destructive' });
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, updates: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const formatGP = (gp: string | number) => {
    const n = parseFloat(String(gp));
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return `${Math.round(n)}`;
  };

  const renderForm = () => (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Name</Label>
        <Input
          placeholder="e.g. Zulrah, Fire Cape, Barbarian Assault"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Aliases (comma-separated short names)</Label>
        <Input
          placeholder="e.g. zul, snake boss"
          value={form.aliases ?? ''}
          onChange={(e) => setForm({ ...form, aliases: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Pricing unit</Label>
          <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {form.type === 'boss' && <SelectItem value="per_kill">Per kill</SelectItem>}
              {form.type === 'minigame' && <SelectItem value="per_point">Per point</SelectItem>}
              {form.type === 'minigame' && <SelectItem value="flat">Flat (one-off)</SelectItem>}
              {form.type === 'item' && <SelectItem value="flat">Flat (one-off)</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Price (GP{form.unit === 'per_kill' ? ' per kill' : form.unit === 'per_point' ? ' per point' : ''})</Label>
          <Input
            type="number"
            min="0"
            placeholder="e.g. 15000"
            value={form.priceGp}
            onChange={(e) => setForm({ ...form, priceGp: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Estimated duration (optional)</Label>
          <Input
            placeholder="e.g. 2-3 hours"
            value={form.duration ?? ''}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Sort order</Label>
          <Input
            type="number"
            value={form.sortOrder ?? 0}
            onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Description (optional)</Label>
        <Textarea
          placeholder="Notes shown to customers, e.g. includes all loot drops"
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.isActive ?? true} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
        <Label>Active (visible to bot)</Label>
      </div>
    </div>
  );

  const renderTypeTab = (type: string) => {
    const meta = TYPE_META[type];
    const typeItems = items.filter(i => i.type === type);
    return (
      <TabsContent value={type}>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            Prices for the <code>{meta.command}</code> command. Priced {meta.unitHint}.
          </p>
          <Button size="sm" onClick={() => openCreate(type)}>
            <Plus className="h-4 w-4 mr-1" /> Add {meta.label.replace(/s$/, '')}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : typeItems.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No {meta.label.toLowerCase()} priced yet — add the first one.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {typeItems.map(item => (
              <Card key={item.id} className="py-3">
                <CardContent className="px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{item.name}</span>
                        <Badge variant="outline">{UNIT_LABELS[item.unit] || item.unit}</Badge>
                        {!item.isActive && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        💰 <span className="font-semibold text-foreground">{formatGP(item.priceGp)} GP</span>
                        {item.duration && <> • ⏱️ {item.duration}</>}
                        {item.aliases && <> • aka {item.aliases}</>}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${item.name}"?`)) deleteMutation.mutate(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    );
  };

  return (
    <div className="container mx-auto py-8" data-testid="calculator-pricing-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Calculator className="h-8 w-8" /> Calculator Pricing
          </h1>
          <p className="text-muted-foreground">Manage prices for !b (bosses), !im (items) and !m (minigames) commands</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Swords className="h-4 w-4" /> How it works
          </CardTitle>
          <CardDescription>
            <code>!b zulrah 100</code> → 100 kills × per-kill price • <code>!im fire cape</code> → flat price •
            <code> !m ba 500</code> → 500 points × per-point price. Customers' rank discounts apply automatically,
            and prices show in GP + USD using the rate from the GP Rates page.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="boss">
        <TabsList>
          <TabsTrigger value="boss">⚔️ Bosses</TabsTrigger>
          <TabsTrigger value="item">🏺 Items</TabsTrigger>
          <TabsTrigger value="minigame">🎮 Minigames</TabsTrigger>
        </TabsList>
        {renderTypeTab('boss')}
        {renderTypeTab('item')}
        {renderTypeTab('minigame')}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : `Add ${TYPE_META[form.type].label.replace(/s$/, '')}`}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the price and details.' : 'Customers use this immediately via the bot.'}
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Save Changes' : 'Add Price'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
