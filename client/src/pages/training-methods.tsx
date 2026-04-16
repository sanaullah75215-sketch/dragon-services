import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Edit, Plus, Trash2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface Skill {
  id: string;
  name: string;
  icon: string;
  category: string;
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

interface MethodRow {
  name: string;
  minLevel: number;
  maxLevel: number;
  gpPerXp: string;
}

const emptyRow = (): MethodRow => ({ name: "", minLevel: 1, maxLevel: 99, gpPerXp: "" });

export default function TrainingMethods() {
  const { toast } = useToast();
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<TrainingMethod | null>(null);

  // For the add-new-method dialog: skill + multiple rows
  const [dialogSkillId, setDialogSkillId] = useState<string>("");
  const [rows, setRows] = useState<MethodRow[]>([emptyRow()]);

  const { data: skills = [] } = useQuery<Skill[]>({ queryKey: ["/api/skills"] });
  const { data: trainingMethods = [], isLoading } = useQuery<TrainingMethod[]>({ queryKey: ["/api/training-methods"] });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<TrainingMethod>) => {
      const res = await fetch("/api/training-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/training-methods"] }),
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TrainingMethod> & { id: string }) => {
      const res = await fetch(`/api/training-methods/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-methods"] });
      setIsDialogOpen(false);
      setEditingMethod(null);
      toast({ title: "Updated successfully!" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/training-methods/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-methods"] });
      toast({ title: "Deleted successfully!" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  // Group methods by skill then by method name
  const filtered = selectedSkill && selectedSkill !== "all"
    ? trainingMethods.filter(m => m.skillId === selectedSkill)
    : trainingMethods;

  // Group: skillId -> methodName -> entries[]
  const grouped: Map<string, Map<string, TrainingMethod[]>> = new Map();
  for (const m of filtered) {
    if (!grouped.has(m.skillId)) grouped.set(m.skillId, new Map());
    const byName = grouped.get(m.skillId)!;
    if (!byName.has(m.name)) byName.set(m.name, []);
    byName.get(m.name)!.push(m);
  }
  // Sort each group by minLevel
  for (const byName of grouped.values()) {
    for (const entries of byName.values()) {
      entries.sort((a, b) => a.minLevel - b.minLevel);
    }
  }

  const getSkill = (id: string) => skills.find(s => s.id === id);

  // Open "add new method" dialog fresh
  const openAddDialog = (prefillSkillId?: string, prefillName?: string) => {
    setEditingMethod(null);
    setDialogSkillId(prefillSkillId || "");
    setRows([{ name: prefillName || "", minLevel: 1, maxLevel: 99, gpPerXp: "" }]);
    setIsDialogOpen(true);
  };

  // Open edit dialog for a single entry
  const openEditDialog = (method: TrainingMethod) => {
    setEditingMethod(method);
    setDialogSkillId(method.skillId);
    setRows([{ name: method.name, minLevel: method.minLevel, maxLevel: method.maxLevel, gpPerXp: method.gpPerXp }]);
    setIsDialogOpen(true);
  };

  const updateRow = (i: number, field: keyof MethodRow, value: string | number) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    setRows(prev => {
      const last = prev[prev.length - 1];
      return [...prev, { name: last.name, minLevel: last.maxLevel, maxLevel: 99, gpPerXp: "" }];
    });
  };

  const removeRow = (i: number) => {
    setRows(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!dialogSkillId) {
      toast({ title: "Please select a skill", variant: "destructive" });
      return;
    }
    for (const row of rows) {
      if (!row.name || !row.gpPerXp) {
        toast({ title: "Please fill in all fields", variant: "destructive" });
        return;
      }
    }

    if (editingMethod) {
      // Single row edit
      const row = rows[0];
      await updateMutation.mutateAsync({
        id: editingMethod.id,
        skillId: dialogSkillId,
        name: row.name,
        gpPerXp: row.gpPerXp,
        minLevel: Number(row.minLevel),
        maxLevel: Number(row.maxLevel),
        xpPerHour: editingMethod.xpPerHour || 50000,
        isActive: true,
        sortOrder: editingMethod.sortOrder || 0,
      });
    } else {
      // Create all rows
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        await createMutation.mutateAsync({
          skillId: dialogSkillId,
          name: row.name,
          gpPerXp: row.gpPerXp,
          minLevel: Number(row.minLevel),
          maxLevel: Number(row.maxLevel),
          xpPerHour: 50000,
          isActive: true,
          sortOrder: i,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/training-methods"] });
      setIsDialogOpen(false);
      toast({ title: `${rows.length} method range${rows.length > 1 ? "s" : ""} added!` });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Training Methods</h1>
          <p className="text-muted-foreground">Manage skill training methods and pricing for the calculator</p>
        </div>
        <Button onClick={() => openAddDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Method
        </Button>
      </div>

      {/* Skill filter */}
      <div className="mb-6">
        <Select value={selectedSkill} onValueChange={setSelectedSkill}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All skills" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All skills</SelectItem>
            {skills.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grouped display */}
      {isLoading ? (
        <p>Loading...</p>
      ) : grouped.size === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No training methods yet. Click "Add Method" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([skillId, byName]) => {
            const skill = getSkill(skillId);
            return (
              <div key={skillId}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span>{skill?.icon}</span>
                  <span>{skill?.name || "Unknown Skill"}</span>
                </h2>
                <div className="space-y-3">
                  {Array.from(byName.entries()).map(([methodName, entries]) => (
                    <Card key={methodName}>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-semibold">{methodName}</CardTitle>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddDialog(skillId, methodName)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Range
                        </Button>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {entries.map(entry => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between rounded-md border px-4 py-2 bg-muted/30"
                            >
                              <div className="flex items-center gap-6 text-sm">
                                <div>
                                  <span className="text-muted-foreground text-xs">Level Range</span>
                                  <p className="font-medium">{entry.minLevel} – {entry.maxLevel}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">GP per XP</span>
                                  <p className="font-medium text-green-500">{entry.gpPerXp} gp/xp</p>
                                </div>
                                {!entry.isActive && (
                                  <Badge variant="destructive" className="text-xs">Inactive</Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEditDialog(entry)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => deleteMutation.mutate(entry.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={v => { setIsDialogOpen(v); if (!v) setEditingMethod(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMethod ? "Edit Level Range" : "Add Training Method"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Skill selector */}
            <div>
              <Label>Skill</Label>
              <Select value={dialogSkillId} onValueChange={setDialogSkillId} disabled={!!editingMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a skill" />
                </SelectTrigger>
                <SelectContent>
                  {skills.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rows */}
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="rounded-md border p-3 space-y-3 bg-muted/20 relative">
                  {rows.length > 1 && !editingMethod && (
                    <button
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(i)}
                      type="button"
                    >
                      ✕
                    </button>
                  )}

                  {/* Method Name */}
                  <div>
                    <Label className="text-xs">Method Name</Label>
                    <Input
                      value={row.name}
                      onChange={e => updateRow(i, "name", e.target.value)}
                      placeholder="e.g., Master Farmer"
                      disabled={!!editingMethod}
                    />
                    {!editingMethod && i > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Same name = grouped together in the calculator
                      </p>
                    )}
                  </div>

                  {/* Level range + price in a row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Min Level</Label>
                      <Input
                        type="number"
                        min={1}
                        max={126}
                        value={row.minLevel}
                        onChange={e => updateRow(i, "minLevel", parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max Level</Label>
                      <Input
                        type="number"
                        min={1}
                        max={126}
                        value={row.maxLevel}
                        onChange={e => updateRow(i, "maxLevel", parseInt(e.target.value) || 99)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">GP per XP</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={row.gpPerXp}
                        onChange={e => updateRow(i, "gpPerXp", e.target.value)}
                        placeholder="e.g., 50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add another range button (only when creating, not editing) */}
            {!editingMethod && (
              <Button type="button" variant="outline" className="w-full" onClick={addRow}>
                <Plus className="w-4 h-4 mr-2" />
                Add Another Level Range
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : editingMethod ? "Save Changes" : `Save ${rows.length > 1 ? `${rows.length} Ranges` : "Method"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
