import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import BotStatus from "@/components/bot-status";
import ServiceCard from "@/components/service-card";
import LoadingWithTimeout from "@/components/loading-with-timeout";
import { Service } from "@shared/schema";
import { Settings, ExternalLink, Bot, Gift, Wallet, Package, ShoppingCart, AlertCircle, DollarSign, Menu } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: services, isLoading: servicesLoading, error: servicesError } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: botStatus, isLoading: statusLoading, error: statusError } = useQuery<{
    isOnline: boolean;
    uptime: number;
    serversCount: number;
    commandsRegistered: number;
  }>({
    queryKey: ["/api/bot-status"],
    refetchInterval: 30000,
  });

  const navigationLinks = [
    { href: "/services", label: "Services", icon: Settings, testId: "button-services" },
    { href: "/training-methods", label: "Training Methods", icon: Settings, testId: "button-training-methods" },
    { href: "/quest-management", label: "Quest Management", icon: Settings, testId: "button-quest-management" },
    { href: "/special-offers", label: "Special Offers", icon: Gift, testId: "button-special-offers" },
    { href: "/admin/gp-rates", label: "GP Rates", icon: DollarSign, testId: "button-gp-rates" },
    { href: "/admin/wallets", label: "Wallet Management", icon: Wallet, testId: "button-wallet" },
    { href: "/orders", label: "Orders", icon: Package, testId: "button-orders" },
    { href: "/create-order", label: "Create Order", icon: ShoppingCart, testId: "button-create-order" },
    { href: "/bot-management", label: "Management", icon: Settings, testId: "button-management" },
  ];

  if (servicesError || statusError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Failed to Load</h2>
                <p className="text-sm text-muted-foreground">Unable to fetch application data</p>
              </div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm font-mono text-destructive">
                {(servicesError as Error)?.message || (statusError as Error)?.message || "Network error"}
              </p>
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
              data-testid="button-reload-error"
            >
              Reload Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (servicesLoading || statusLoading) {
    return <LoadingWithTimeout timeout={15000} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">Dragon Services</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Discord Bot Management Dashboard</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden xl:flex items-center space-x-2">
              <BotStatus status={botStatus} />
              {navigationLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <Button variant="outline" size="sm" data-testid={link.testId}>
                      <Icon className="h-4 w-4 mr-2" />
                      {link.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Menu */}
            <div className="flex xl:hidden items-center gap-2">
              <BotStatus status={botStatus} />
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-mobile-menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Navigation</SheetTitle>
                    <SheetDescription>
                      Dragon Services Dashboard
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col gap-2 mt-6">
                    {navigationLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link key={link.href} href={link.href}>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            data-testid={link.testId}
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            {link.label}
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16 md:py-24">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 tracking-wider drop-shadow-lg">
              DRAGON SERVICES
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Professional OSRS Services • Fast • Reliable • Secure
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-300 px-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Bot Online</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <span>24/7 Support</span>
              <span className="hidden sm:inline">•</span>
              <span>Secure Transactions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Discord Preview Section */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <Card className="discord-embed overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 text-muted-foreground mb-4 sm:mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm">#dragon-services</span>
              <span className="text-xs">•</span>
              <span className="text-xs">Bot is online</span>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground border-b border-border pb-2">
                Available Services
              </h3>
              
              <div className="grid gap-2 sm:gap-3">
                {services?.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
              
              <div className="border-t border-border pt-3 sm:pt-4 mt-4 sm:mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
                  <span>Dragon Services Bot</span>
                  <span className="text-xs sm:text-sm">Use /dragon-services to access this menu</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Instructions Section */}
      <div className="max-w-4xl mx-auto px-4 pb-8 sm:pb-12">
        <Card className="p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">How to Use the Discord Bot</h3>
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h4 className="font-medium mb-2 text-sm sm:text-base">1. Invite the Bot</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                Add the Dragon Services bot to your Discord server with the appropriate permissions.
              </p>
              <Button size="sm" variant="outline" data-testid="button-invite">
                <ExternalLink className="h-4 w-4 mr-2" />
                Invite Bot
              </Button>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-sm sm:text-base">2. Use Commands</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                Type <code className="bg-muted px-1 rounded text-xs sm:text-sm">/dragon-services</code> in any channel to access the services menu.
              </p>
              <Badge variant="secondary" className="text-xs sm:text-sm">/dragon-services</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="text-center text-xs sm:text-sm text-muted-foreground">
            <p className="flex flex-wrap items-center justify-center gap-2 sm:gap-0">
              <span>💾 Powered by Discord.js</span>
              <span className="hidden sm:inline"> • </span>
              <span>🔒 Secure Transactions</span>
              <span className="hidden sm:inline"> • </span>
              <span>⚡ 24/7 Support</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
