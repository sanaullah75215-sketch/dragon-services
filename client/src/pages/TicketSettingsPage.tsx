import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Ticket,
  Settings,
  Save,
  LayoutGrid,
} from "lucide-react";

interface Panel {
  id: string;
  name: string;
  channelId: string;
  openCategoryId: string;
  closedCategoryId: string;
  buttonLabel: string;
  buttonEmoji: string | null;
  buttonColor: string;
  description: string | null;
  pingRoleIds: string[];
  enabled: boolean;
  createdAt: string;
}

const BUTTON_COLORS = [
  { value: "primary", label: "Blurple (Primary)" },
  { value: "secondary", label: "Grey (Secondary)" },
  { value: "success", label: "Green (Success)" },
  { value: "danger", label: "Red (Danger)" },
];

function PanelForm({
  initial,
  onSubmit,
  loading,
}: {
  initial?: Partial<Panel>;
  onSubmit: (data: Partial<Panel>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<Partial<Panel>>({
    name: "",
    channelId: "",
    openCategoryId: "",
    closedCategoryId: "",
    buttonLabel: "Open Ticket",
    buttonEmoji: "🎫",
    buttonColor: "primary",
    description: "",
    pingRoleIds: [],
    enabled: true,
    ...initial,
  });
  const [roleInput, setRoleInput] = useState((initial?.pingRoleIds ?? []).join(", "));

  const set = (k: keyof Panel, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    const roles = roleInput
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    onSubmit({ ...form, pingRoleIds: roles });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Panel Name</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Support" />
        </div>
        <div className="space-y-1">
          <Label>Channel ID</Label>
          <Input value={form.channelId} onChange={(e) => set("channelId", e.target.value)} placeholder="123456789012345678" />
        </div>
        <div className="space-y-1">
          <Label>Open Category ID</Label>
          <Input value={form.openCategoryId} onChange={(e) => set("openCategoryId", e.target.value)} placeholder="Open tickets category" />
        </div>
        <div className="space-y-1">
          <Label>Closed Category ID</Label>
          <Input value={form.closedCategoryId} onChange={(e) => set("closedCategoryId", e.target.value)} placeholder="Closed tickets category" />
        </div>
        <div className="space-y-1">
          <Label>Button Label</Label>
          <Input value={form.buttonLabel} onChange={(e) => set("buttonLabel", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Button Emoji</Label>
          <Input value={form.buttonEmoji ?? ""} onChange={(e) => set("buttonEmoji", e.target.value)} placeholder="🎫" />
        </div>
        <div className="space-y-1">
          <Label>Button Color</Label>
          <Select value={form.buttonColor} onValueChange={(v) => set("buttonColor", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUTTON_COLORS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex items-center gap-2 pt-6">
          <Switch checked={!!form.enabled} onCheckedChange={(v) => set("enabled", v)} id="enabled" />
          <Label htmlFor="enabled">Enabled</Label>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Description (shown on embed)</Label>
        <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={2} />
      </div>
      <div className="space-y-1">
        <Label>Ping Role IDs (comma-separated)</Label>
        <Input value={roleInput} onChange={(e) => setRoleInput(e.target.value)} placeholder="1234567890, 9876543210" />
      </div>
      <Button onClick={handleSubmit} disabled={loading} className="w-full">
        <Save className="h-4 w-4 mr-2" /> {loading ? "Saving…" : "Save Panel"}
      </Button>
    </div>
  );
}

export default function TicketSettingsPage() {
  const { toast } = useToast();

  const { data: panels = [], isLoading: panelsLoading } = useQuery<Panel[]>({
    queryKey: ["/api/ticket-panels"],
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/ticket-settings"],
  });

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (settingsData) setSettings(settingsData);
  }, [settingsData]);

  const setSetting = (k: string, v: string) => setSettings((s) => ({ ...s, [k]: v }));

  const saveSettings = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/ticket-settings", settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ticket-settings"] });
      toast({ title: "Settings saved" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" }),
  });

  const createPanel = useMutation({
    mutationFn: (data: Partial<Panel>) => apiRequest("POST", "/api/ticket-panels", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ticket-panels"] });
      setCreateOpen(false);
      toast({ title: "Panel created" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create panel.", variant: "destructive" }),
  });

  const updatePanel = useMutation({
    mutationFn: (data: Partial<Panel>) =>
      apiRequest("PUT", `/api/ticket-panels/${editingPanel!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ticket-panels"] });
      setEditingPanel(null);
      toast({ title: "Panel updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update panel.", variant: "destructive" }),
  });

  const deletePanel = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/ticket-panels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ticket-panels"] });
      toast({ title: "Panel deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete panel.", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/tickets">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Tickets
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Ticket Settings</h1>
          </div>
        </div>

        {/* General Settings */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" /> General Settings
            </CardTitle>
            <CardDescription>Global ticket system configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Open Category ID</Label>
                    <Input
                      value={settings["openCategoryId"] ?? ""}
                      onChange={(e) => setSetting("openCategoryId", e.target.value)}
                      placeholder="Discord category ID for open tickets"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Closed Category ID</Label>
                    <Input
                      value={settings["closedCategoryId"] ?? ""}
                      onChange={(e) => setSetting("closedCategoryId", e.target.value)}
                      placeholder="Discord category ID for closed tickets"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Staff Role IDs (comma-separated)</Label>
                    <Input
                      value={settings["staffRoleIds"] ?? ""}
                      onChange={(e) => setSetting("staffRoleIds", e.target.value)}
                      placeholder="Role IDs who can manage tickets"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Stale Ticket Days</Label>
                    <Input
                      type="number"
                      value={settings["staleTicketDays"] ?? "7"}
                      onChange={(e) => setSetting("staleTicketDays", e.target.value)}
                      placeholder="7"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Transcript Log Channel ID</Label>
                    <Input
                      value={settings["transcriptChannelId"] ?? ""}
                      onChange={(e) => setSetting("transcriptChannelId", e.target.value)}
                      placeholder="Channel where transcripts are posted on close"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    id="autoClose"
                    checked={settings["autoCloseEnabled"] === "true"}
                    onCheckedChange={(v) => setSetting("autoCloseEnabled", String(v))}
                  />
                  <Label htmlFor="autoClose">Auto-close stale tickets</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="transcriptEnabled"
                    checked={settings["transcriptEnabled"] !== "false"}
                    onCheckedChange={(v) => setSetting("transcriptEnabled", String(v))}
                  />
                  <Label htmlFor="transcriptEnabled">Generate HTML transcripts on close</Label>
                </div>
                <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} className="gap-2">
                  <Save className="h-4 w-4" /> {saveSettings.isPending ? "Saving…" : "Save Settings"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Panels */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5" /> Ticket Panels
                </CardTitle>
                <CardDescription>Configure ticket creation panels posted in Discord channels</CardDescription>
              </div>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" /> New Panel
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Ticket Panel</DialogTitle>
                    <DialogDescription>Configure a new ticket creation panel for a Discord channel.</DialogDescription>
                  </DialogHeader>
                  <PanelForm onSubmit={(d) => createPanel.mutate(d)} loading={createPanel.isPending} />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {panelsLoading ? (
              <p className="text-muted-foreground text-sm">Loading panels…</p>
            ) : panels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <LayoutGrid className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No panels configured yet. Create one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {panels.map((panel) => (
                  <div
                    key={panel.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20 gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl">{panel.buttonEmoji ?? "🎫"}</span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{panel.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Channel: <code>{panel.channelId}</code> · Color: {panel.buttonColor}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${
                        panel.enabled
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                      }`}>
                        {panel.enabled ? "Enabled" : "Disabled"}
                      </span>
                      <Dialog
                        open={editingPanel?.id === panel.id}
                        onOpenChange={(open) => !open && setEditingPanel(null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => setEditingPanel(panel)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Panel — {panel.name}</DialogTitle>
                          </DialogHeader>
                          {editingPanel?.id === panel.id && (
                            <PanelForm
                              initial={panel}
                              onSubmit={(d) => updatePanel.mutate(d)}
                              loading={updatePanel.isPending}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive/70" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete panel "{panel.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the panel configuration. The Discord message is not affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deletePanel.mutate(panel.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
