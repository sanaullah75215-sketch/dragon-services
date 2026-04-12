import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface BotStatusProps {
  status?: {
    isOnline: boolean;
    uptime: number;
    serversCount: number;
    commandsRegistered: number;
  };
}

export default function BotStatus({ status }: BotStatusProps) {
  if (!status) {
    return (
      <Badge variant="secondary" data-testid="badge-status-unknown">
        Unknown
      </Badge>
    );
  }

  const formatUptime = (uptime: number) => {
    if (!uptime) return "0s";
    const seconds = Math.floor(uptime / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={status.isOnline ? "default" : "destructive"}
          className="cursor-help"
          data-testid="badge-status"
        >
          <div className={`w-2 h-2 rounded-full mr-2 ${status.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {status.isOnline ? 'Online' : 'Offline'}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p><strong>Status:</strong> {status.isOnline ? 'Online' : 'Offline'}</p>
          <p><strong>Uptime:</strong> {formatUptime(status.uptime)}</p>
          <p><strong>Servers:</strong> {status.serversCount}</p>
          <p><strong>Commands:</strong> {status.commandsRegistered}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
