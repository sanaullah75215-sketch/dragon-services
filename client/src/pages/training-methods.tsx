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
import { Edit, Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Skill {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  isActive: boolean;
}

interface TrainingMethod {
  id: string;
  skillId: string;
  name: string;
  description: string;
  gpPerXp: string;
  xpPerHour: number;
  minLevel: number;
  maxLevel: number;
  isActive: boolean;
  sortOrder: number;
}

export default function TrainingMethods() {
  const { toast } = useToast();
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [editingMethod, setEditingMethod] = useState<TrainingMethod | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch skills and training methods
  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ['/api/skills'],
  });

  const { data: trainingMethods = [], isLoading } = useQuery<TrainingMethod[]>({
    queryKey: ['/api/training-methods'],
  });

  // Mutations
  const createMethodMutation = useMutation({
    mutationFn: async (methodData: Partial<TrainingMethod>) => {
      const response = await fetch('/api/training-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(methodData),
      });
      if (!response.ok) throw new Error('Failed to create method');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-methods'] });
      setIsDialogOpen(false);
      setEditingMethod(null);
      toast({ title: "Training method created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create training method", variant: "destructive" });
    },
  });

  const updateMethodMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TrainingMethod> & { id: string }) => {
      const response = await fetch(`/api/training-methods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update method');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-methods'] });
      setIsDialogOpen(false);
      setEditingMethod(null);
      toast({ title: "Training method updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update training method", variant: "destructive" });
    },
  });

  const deleteMethodMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/training-methods/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete method');
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-methods'] });
      toast({ title: "Training method deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete training method", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const methodData = {
      skillId: formData.get('skillId') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      gpPerXp: formData.get('gpPerXp') as string,
      xpPerHour: 50000, // Default value since we're not collecting it
      minLevel: parseInt(formData.get('minLevel') as string) || 1,
      maxLevel: parseInt(formData.get('maxLevel') as string) || 99,
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      isActive: true,
    };

    if (editingMethod) {
      updateMethodMutation.mutate({ id: editingMethod.id, ...methodData });
    } else {
      createMethodMutation.mutate(methodData);
    }
  };

  const filteredMethods = selectedSkill && selectedSkill !== 'all'
    ? trainingMethods.filter(method => method.skillId === selectedSkill)
    : trainingMethods;

  const getSkillName = (skillId: string) => {
    return skills.find(skill => skill.id === skillId)?.name || 'Unknown';
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Training Methods Management</h1>
          <p className="text-muted-foreground">
            Manage OSRS training methods and their pricing for the skill calculator
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingMethod(null)} data-testid="button-add-method">
              <Plus className="w-4 h-4 mr-2" />
              Add Training Method
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMethod ? 'Edit Training Method' : 'Add Training Method'}
              </DialogTitle>
              <DialogDescription>
                Configure the training method details and pricing.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="skillId">Skill</Label>
                <Select name="skillId" defaultValue={editingMethod?.skillId || undefined} required>
                  <SelectTrigger data-testid="select-skill">
                    <SelectValue placeholder="Select a skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {skills.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.icon} {skill.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="name">Method Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingMethod?.name || ''}
                  placeholder="e.g., ZMI, Lava Runes"
                  required
                  data-testid="input-method-name"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingMethod?.description || ''}
                  placeholder="Brief description of the training method"
                  data-testid="textarea-description"
                />
              </div>

              <div>
                <Label htmlFor="gpPerXp">GP per XP</Label>
                <Input
                  id="gpPerXp"
                  name="gpPerXp"
                  type="number"
                  step="0.01"
                  defaultValue={editingMethod?.gpPerXp || ''}
                  placeholder="e.g., 180.00"
                  required
                  data-testid="input-gp-per-xp"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="minLevel">Min Level</Label>
                  <Input
                    id="minLevel"
                    name="minLevel"
                    type="number"
                    defaultValue={editingMethod?.minLevel || 1}
                    min="1"
                    max="126"
                    data-testid="input-min-level"
                  />
                </div>
                <div>
                  <Label htmlFor="maxLevel">Max Level</Label>
                  <Input
                    id="maxLevel"
                    name="maxLevel"
                    type="number"
                    defaultValue={editingMethod?.maxLevel || 99}
                    min="1"
                    max="126"
                    data-testid="input-max-level"
                  />
                </div>
                <div>
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    name="sortOrder"
                    type="number"
                    defaultValue={editingMethod?.sortOrder || 0}
                    data-testid="input-sort-order"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createMethodMutation.isPending || updateMethodMutation.isPending}>
                  {editingMethod ? 'Update Method' : 'Create Method'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter by skill */}
      <div className="mb-6">
        <Label htmlFor="skillFilter">Filter by Skill</Label>
        <Select value={selectedSkill} onValueChange={setSelectedSkill}>
          <SelectTrigger className="w-[250px]" data-testid="select-skill-filter">
            <SelectValue placeholder="All skills" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All skills</SelectItem>
            {skills.map((skill) => (
              <SelectItem key={skill.id} value={skill.id}>
                {skill.icon} {skill.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Training methods list */}
      <div className="grid gap-6">
        {isLoading ? (
          <div>Loading training methods...</div>
        ) : filteredMethods.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p>No training methods found. Create your first training method to get started!</p>
            </CardContent>
          </Card>
        ) : (
          filteredMethods.map((method) => (
            <Card key={method.id} data-testid={`card-method-${method.id}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl">{method.name}</CardTitle>
                  <Badge variant="secondary">{getSkillName(method.skillId)}</Badge>
                  {!method.isActive && (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingMethod(method);
                      setIsDialogOpen(true);
                    }}
                    data-testid={`button-edit-${method.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMethodMutation.mutate(method.id)}
                    disabled={deleteMethodMutation.isPending}
                    data-testid={`button-delete-${method.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium">GP per XP</p>
                    <p className="text-2xl font-bold text-green-600">{method.gpPerXp}</p>
                  </div>
                  <div>
                    <p className="font-medium">Level Range</p>
                    <p className="text-lg">{method.minLevel} - {method.maxLevel}</p>
                  </div>
                  <div>
                    <p className="font-medium">Sort Order</p>
                    <p className="text-lg">{method.sortOrder}</p>
                  </div>
                </div>
                {method.description && (
                  <p className="mt-3 text-muted-foreground">{method.description}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}