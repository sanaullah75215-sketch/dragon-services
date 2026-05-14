import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { Ticket, ExternalLink, Trash2, FileText, Search, ArrowLeft, Settings } from "lucide-react";
import { useState, useMemo } from "react";

interface TicketRow {
  id: string;
  ticketNumber: number | null;
  channelId: string;
  userId: string;
  status: string;
  subject: string | null;
  createdAt: string;
  closedAt: string | null;
  transcriptHtml: string | null;
  channelDeleted: boolean | null;
}

const statusColor: Record<string, string> = {
  open: "bg-green-500/20 text-green-400 border-green-500/30",
  closed: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export default function TicketsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: tickets = [], isLoading } = useQuery<TicketRow[]>({
    queryKey: ["/api/tickets"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tickets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket removed", description: "The ticket has been hidden from the list." });
    },
    onError: () => toast({ title: "Error", description: "Failed to remove ticket.", variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        !search ||
        String(t.ticketNumber ?? "").includes(search) ||
        (t.subject ?? "").toLowerCase().includes(search.toLowerCase()) ||
        t.userId.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchStatus && !t.channelDeleted;
    });
  }, [tickets, search, statusFilter]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Ticket className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Tickets</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tickets/settings">
              <Button variant="outline" size="sm" className="gap-1">
                <Settings className="h-4 w-4" /> Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: tickets.filter(t => !t.channelDeleted).length, color: "text-foreground" },
            { label: "Open", value: tickets.filter(t => t.status === "open" && !t.channelDeleted).length, color: "text-green-400" },
            { label: "Closed", value: tickets.filter(t => t.status === "closed" && !t.channelDeleted).length, color: "text-zinc-400" },
            { label: "Transcripts", value: tickets.filter(t => t.transcriptHtml && !t.channelDeleted).length, color: "text-blue-400" },
          ].map(s => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticket #, user, or subject…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {["all", "open", "closed", "pending"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => setStatusFilter(s)}
                  className="capitalize"
                >
                  {s}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading tickets…</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No tickets found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="w-24"># Number</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id} className="border-border/50 hover:bg-muted/30">
                      <TableCell className="font-mono text-sm">
                        {t.ticketNumber != null ? `#${String(t.ticketNumber).padStart(3, "0")}` : "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{t.subject ?? "(no subject)"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{t.userId}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${statusColor[t.status] ?? statusColor.closed}`}>
                          {t.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.closedAt ? new Date(t.closedAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {t.transcriptHtml && (
                            <Link href={`/tickets/${t.id}/transcript`}>
                              <Button variant="ghost" size="icon" title="View transcript">
                                <FileText className="h-4 w-4 text-blue-400" />
                              </Button>
                            </Link>
                          )}
                          <a
                            href={`https://discord.com/channels/@me/${t.channelId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" title="Open in Discord">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Remove from list">
                                <Trash2 className="h-4 w-4 text-destructive/70" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove ticket?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This hides the ticket from the dashboard. The Discord channel is not affected.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate(t.id)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
