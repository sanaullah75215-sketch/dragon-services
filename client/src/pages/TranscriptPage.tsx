import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";

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
}

export default function TranscriptPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isLoading, isError } = useQuery<TicketRow>({
    queryKey: ["/api/tickets", id],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const handleDownload = () => {
    if (!ticket?.transcriptHtml) return;
    const blob = new Blob([ticket.transcriptHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${ticket.ticketNumber != null ? String(ticket.ticketNumber).padStart(3, "0") : ticket.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ticketLabel = ticket?.ticketNumber != null
    ? `#${String(ticket.ticketNumber).padStart(3, "0")}`
    : ticket?.id?.slice(0, 8) ?? "…";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Loading transcript…</p>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center flex-col gap-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Ticket not found.</p>
        <Link href="/tickets">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Tickets</Button>
        </Link>
      </div>
    );
  }

  if (!ticket.transcriptHtml) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center flex-col gap-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No transcript available for this ticket yet.</p>
        <Link href="/tickets">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Tickets</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border/50 bg-card px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/tickets">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Tickets
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold">Transcript {ticketLabel}</span>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${
            ticket.status === "open"
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
          }`}>
            {ticket.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>User: <code className="text-xs bg-muted px-1 rounded">{ticket.userId}</code></span>
          <span>·</span>
          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
          <Button variant="outline" size="sm" className="gap-1 ml-2" onClick={handleDownload}>
            <Download className="h-4 w-4" /> Download HTML
          </Button>
          <a
            href={`https://discord.com/channels/@me/${ticket.channelId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="h-4 w-4" /> Discord
            </Button>
          </a>
        </div>
      </div>

      {/* Transcript iframe */}
      <div className="flex-1 p-4">
        <iframe
          srcDoc={ticket.transcriptHtml}
          title="Ticket Transcript"
          className="w-full h-full min-h-[calc(100vh-100px)] rounded-lg border border-border/50 bg-white"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
