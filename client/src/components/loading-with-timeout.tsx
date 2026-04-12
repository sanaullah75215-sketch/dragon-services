import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LoadingWithTimeoutProps {
  timeout?: number;
}

export default function LoadingWithTimeout({ timeout = 15000 }: LoadingWithTimeoutProps) {
  const [showTimeout, setShowTimeout] = useState(false);
  const [countdown, setCountdown] = useState(Math.floor(timeout / 1000));

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, timeout);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
    };
  }, [timeout]);

  if (showTimeout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <CardTitle>Loading is taking longer than expected</CardTitle>
                <CardDescription>The application may be experiencing issues</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This could be due to:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Slow network connection</li>
                <li>Server is starting up</li>
                <li>API endpoints are not responding</li>
                <li>Browser cache issues</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="flex-1"
                data-testid="button-reload-timeout"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              <Button 
                onClick={() => setShowTimeout(false)} 
                variant="outline"
                className="flex-1"
                data-testid="button-keep-waiting"
              >
                Keep Waiting
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">Loading Dragon Services</p>
        <p className="text-sm text-muted-foreground">
          {countdown > 0 ? `Still loading... (${countdown}s)` : "Almost there..."}
        </p>
      </div>
    </div>
  );
}
