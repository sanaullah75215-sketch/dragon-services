import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";
import { ArrowLeft, Plus, Edit, Trash2, ChevronDown, ChevronRight, GripVertical, X } from "lucide-react";
import { Service, type ServiceOption, type PriceItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ServiceManagement() {
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<{ service: Service; option: ServiceOption | null; index: number | null } | null>(null);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  // Service form state
  const [svcName, setSvcName] = useState("");
  const [svcIcon, setSvcIcon] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcCategory, setSvcCategory] = useState("");

  // Option form state
  const [optName, setOptName] = useState("");
  const [optDesc, setOptDesc] = useState("");
  const [optNote, setOptNote] = useState("");
  const [optPriceItems, setOptPriceItems] = useState<PriceItem[]>([]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setServiceDialogOpen(false);
      toast({ title: "Service updated!" });
    },
    onError: () => toast({ title: "Failed to update service", variant: "destructive" }),
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/services", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setServiceDialogOpen(false);
      toast({ title: "Service created!" });
    },
    onError: () => toast({ title: "Failed to create service", variant: "destructive" }),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Service deleted!" });
    },
    onError: () => toast({ title: "Failed to delete service", variant: "destructive" }),
  });

  // Save a service's options (when adding/editing/removing an option)
  const saveOptionsMutation = useMutation({
    mutationFn: ({ id, options }: { id: string; options: ServiceOption[] }) =>
      apiRequest("PATCH", `/api/services/${id}`, { options }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setOptionDialogOpen(false);
      toast({ title: "Options saved!" });
    },
    onError: () => toast({ title: "Failed to save options", variant: "destructive" }),
  });

  const toggleExpand = (id: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Service dialog helpers ---
  const openAddService = () => {
    setEditingService(null);
    setSvcName(""); setSvcIcon(""); setSvcDesc(""); setSvcCategory("");
    setServiceDialogOpen(true);
  };

  const openEditService = (service: Service) => {
    setEditingService(service);
    setSvcName(service.name);
    setSvcIcon(service.icon);
    setSvcDesc(service.description);
    setSvcCategory(service.category);
    setServiceDialogOpen(true);
  };

  const handleSaveService = () => {
    if (!svcName || !svcIcon || !svcDesc || !svcCategory) {
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }
    const payload = { name: svcName, icon: svcIcon, description: svcDesc, category: svcCategory, isActive: true };
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data: payload });
    } else {
      createServiceMutation.mutate({ ...payload, options: [] });
    }
  };

  // --- Option dialog helpers ---
  const openAddOption = (service: Service) => {
    setEditingOption({ service, option: null, index: null });
    setOptName(""); setOptDesc(""); setOptNote(""); setOptPriceItems([{ name: "", price: "" }]);
    setOptionDialogOpen(true);
  };

  const openEditOption = (service: Service, option: ServiceOption, index: number) => {
    setEditingOption({ service, option, index });
    setOptName(option.name);
    setOptDesc(option.description || "");
    setOptNote(option.note || "");
    setOptPriceItems(option.priceItems && option.priceItems.length > 0
      ? [...option.priceItems]
      : option.price ? [{ name: option.name, price: option.price }] : [{ name: "", price: "" }]
    );
    setOptionDialogOpen(true);
  };

  const handleSaveOption = () => {
    if (!editingOption) return;
    if (!optName) {
      toast({ title: "Option name required", variant: "destructive" });
      return;
    }

    const cleanPriceItems = optPriceItems.filter(p => p.name.trim() && p.price.trim());
    const updatedOption: ServiceOption = {
      id: editingOption.option?.id || Date.now().toString(),
      name: optName,
      description: optDesc,
      priceItems: cleanPriceItems,
      note: optNote.trim() || undefined,
    };

    const currentOptions = [...(editingOption.service.options || [])];
    if (editingOption.index !== null) {
      currentOptions[editingOption.index] = updatedOption;
    } else {
      currentOptions.push(updatedOption);
    }

    saveOptionsMutation.mutate({ id: editingOption.service.id, options: currentOptions });
  };

  const handleDeleteOption = (service: Service, index: number) => {
    const updatedOptions = [...(service.options || [])].filter((_, i) => i !== index);
    saveOptionsMutation.mutate({ id: service.id, options: updatedOptions });
  };

  const addPriceItem = () => setOptPriceItems(prev => [...prev, { name: "", price: "" }]);
  const removePriceItem = (i: number) => setOptPriceItems(prev => prev.filter((_, idx) => idx !== i));
  const updatePriceItem = (i: number, field: "name" | "price", value: string) => {
    setOptPriceItems(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/management">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Service Management</h1>
              <p className="text-sm text-muted-foreground">Manage categories, sub-services, and price lists</p>
            </div>
          </div>
          <Button onClick={openAddService}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        {services?.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            No service categories yet. Click "Add Category" to get started.
          </div>
        )}

        {services?.map((service) => (
          <Card key={service.id}>
            <Collapsible open={expandedServices.has(service.id)} onOpenChange={() => toggleExpand(service.id)}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center space-x-3 text-left flex-1 min-w-0">
                      {expandedServices.has(service.id)
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      }
                      <span className="text-2xl">{service.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base">{service.name}</span>
                          <Badge variant={service.isActive ? "default" : "secondary"} className="text-xs">
                            {service.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {service.options?.length || 0} options
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{service.description}</p>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEditService(service)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => {
                      if (confirm(`Delete "${service.name}"?`)) deleteServiceMutation.mutate(service.id);
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  <div className="space-y-2">
                    {service.options?.map((option, idx) => {
                      const hasItems = option.priceItems && option.priceItems.length > 0;
                      return (
                        <div key={option.id} className="border border-border rounded-lg p-3 bg-muted/30">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{option.name}</div>
                              {hasItems ? (
                                <div className="mt-1 space-y-0.5">
                                  {option.priceItems!.map((p, pi) => (
                                    <div key={pi} className="text-xs text-muted-foreground flex gap-2">
                                      <span className="font-medium text-foreground">{p.name}</span>
                                      <span>-</span>
                                      <span className="text-green-500">{p.price}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : option.price ? (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Price: <span className="text-green-500">{option.price}</span>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground mt-1 italic">No prices set</div>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button variant="outline" size="sm" onClick={() => openEditOption(service, option, idx)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => {
                                if (confirm(`Remove "${option.name}"?`)) handleDeleteOption(service, idx);
                              }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => openAddOption(service)}>
                      <Plus className="h-3 w-3 mr-2" />
                      Add Sub-Service
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Service Edit/Add Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input placeholder="Minigames" value={svcName} onChange={e => setSvcName(e.target.value)} />
              </div>
              <div>
                <Label>Icon (emoji)</Label>
                <Input placeholder="⚔️" value={svcIcon} onChange={e => setSvcIcon(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Category (internal ID)</Label>
              <Input placeholder="minigames" value={svcCategory} onChange={e => setSvcCategory(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Description shown in Discord" value={svcDesc} onChange={e => setSvcDesc(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveService} disabled={createServiceMutation.isPending || updateServiceMutation.isPending}>
                {editingService ? "Save Changes" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Option Edit/Add Dialog */}
      <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOption?.option ? `Edit: ${editingOption.option.name}` : `Add Sub-Service to ${editingOption?.service.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sub-Service Name</Label>
              <Input
                placeholder="Barbarian Assault"
                value={optName}
                onChange={e => setOptName(e.target.value)}
              />
            </div>
            <div>
              <Label>Description <span className="text-muted-foreground text-xs">(shown in dropdown)</span></Label>
              <Input
                placeholder="Scroll for more options!"
                value={optDesc}
                onChange={e => setOptDesc(e.target.value)}
              />
            </div>

            {/* Price Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Price List</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPriceItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {optPriceItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Fighter Torso"
                      value={item.name}
                      onChange={e => updatePriceItem(i, "name", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="55M"
                      value={item.price}
                      onChange={e => updatePriceItem(i, "price", e.target.value)}
                      className="w-24"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removePriceItem(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {optPriceItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No prices yet. Click "Add Item" to add pricing.
                  </p>
                )}
              </div>
            </div>

            {/* Note */}
            <div>
              <Label>Note <span className="text-muted-foreground text-xs">(shown below prices in Discord)</span></Label>
              <Input
                placeholder="e.g. Slayer helm required for hard diary"
                value={optNote}
                onChange={e => setOptNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOptionDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveOption} disabled={saveOptionsMutation.isPending}>
                {saveOptionsMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
