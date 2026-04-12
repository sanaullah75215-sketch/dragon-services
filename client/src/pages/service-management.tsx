import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { ArrowLeft, Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { Service, insertServiceSchema, type InsertService, type ServiceOption } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ServiceManagement() {
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const form = useForm<InsertService>({
    resolver: zodResolver(insertServiceSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "",
      category: "",
      isActive: true,
      options: []
    }
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: InsertService) => apiRequest("POST", "/api/services", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Service created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create service", variant: "destructive" });
    }
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Service> }) => 
      apiRequest("PATCH", `/api/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setEditingService(null);
      setIsDialogOpen(false);
      toast({ title: "Service updated successfully!" });
    },
    onError: (error: any) => {
      console.error("Update service error:", error);
      toast({ 
        title: "Failed to update service", 
        description: error?.message || "Unknown error", 
        variant: "destructive" 
      });
    }
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Service deactivated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to deactivate service", variant: "destructive" });
    }
  });

  const handleEdit = (service: Service) => {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description,
      icon: service.icon,
      category: service.category,
      isActive: service.isActive,
      options: service.options || []
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: InsertService) => {
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  const addOption = () => {
    const currentOptions = form.getValues("options") || [];
    form.setValue("options", [
      ...currentOptions,
      { id: Date.now().toString(), name: "", description: "", price: "", duration: "" }
    ], { shouldDirty: true });
  };

  const removeOption = (index: number) => {
    const currentOptions = form.getValues("options") || [];
    form.setValue("options", currentOptions.filter((_, i) => i !== index), { shouldDirty: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/management">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Service Management</h1>
                <p className="text-muted-foreground">Manage Dragon Services offerings and pricing</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-service">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Questing" {...field} data-testid="input-service-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="icon"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Icon (emoji)</FormLabel>
                            <FormControl>
                              <Input placeholder="🎯" {...field} data-testid="input-service-icon" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Professional quest completion services" 
                              {...field} 
                              data-testid="input-service-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="questing" {...field} data-testid="input-service-category" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Service Options</Label>
                        <Button type="button" onClick={addOption} size="sm" data-testid="button-add-option">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                      
                      {form.watch("options")?.map((option, index) => (
                        <Card key={index} className="p-4">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label>Option Name</Label>
                              <Input
                                placeholder="Recipe for Disaster"
                                value={option.name}
                                onChange={(e) => {
                                  const currentOptions = [...(form.getValues("options") || [])];
                                  currentOptions[index] = { ...currentOptions[index], name: e.target.value };
                                  form.setValue("options", currentOptions, { shouldDirty: true });
                                }}
                                data-testid={`input-option-name-${index}`}
                              />
                            </div>
                            <div>
                              <Label>Price</Label>
                              <Input
                                placeholder="50M"
                                value={option.price}
                                onChange={(e) => {
                                  const currentOptions = [...(form.getValues("options") || [])];
                                  currentOptions[index] = { ...currentOptions[index], price: e.target.value };
                                  form.setValue("options", currentOptions, { shouldDirty: true });
                                }}
                                data-testid={`input-option-price-${index}`}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label>Duration</Label>
                              <Input
                                placeholder="3-5 days"
                                value={option.duration}
                                onChange={(e) => {
                                  const currentOptions = [...(form.getValues("options") || [])];
                                  currentOptions[index] = { ...currentOptions[index], duration: e.target.value };
                                  form.setValue("options", currentOptions, { shouldDirty: true });
                                }}
                                data-testid={`input-option-duration-${index}`}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button 
                                type="button" 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => removeOption(index)}
                                data-testid={`button-remove-option-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea
                              placeholder="Complete RFD quest series"
                              value={option.description}
                              onChange={(e) => {
                                const currentOptions = [...(form.getValues("options") || [])];
                                currentOptions[index] = { ...currentOptions[index], description: e.target.value };
                                form.setValue("options", currentOptions, { shouldDirty: true });
                              }}
                              data-testid={`input-option-description-${index}`}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                        data-testid="button-save-service"
                      >
                        {editingService ? "Update" : "Create"} Service
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-6">
          {services?.map((service) => (
            <Card key={service.id} data-testid={`service-card-${service.category}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{service.icon}</span>
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{service.name}</span>
                        <Badge variant={service.isActive ? "default" : "secondary"}>
                          {service.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(service)}
                      data-testid={`button-edit-${service.category}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deleteServiceMutation.mutate(service.id)}
                      data-testid={`button-delete-${service.category}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {service.options?.map((option, index) => (
                    <div 
                      key={option.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                      data-testid={`option-${service.category}-${index}`}
                    >
                      <div>
                        <div className="font-medium">{option.name}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span>{option.price}</span>
                        </div>
                        <div className="text-muted-foreground">{option.duration}</div>
                      </div>
                    </div>
                  ))}
                  {(!service.options || service.options.length === 0) && (
                    <div className="text-center text-muted-foreground py-4">
                      No options configured
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}