import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Bot, ShoppingCart, Zap, MapPin, Gift, Wallet, FileText, Shield, Flame, Crown, Swords, CreditCard, DollarSign } from "lucide-react";

export default function Management() {
  const managementSections = [
    {
      title: "🤖 Bot Management",
      description: "Configure Discord bot settings and elite command systems",
      icon: <Bot className="h-6 w-6" />,
      href: "/bot-management",
      color: "bg-gradient-to-r from-orange-600 to-red-600"
    },
    {
      title: "⚔️ Service Management", 
      description: "Manage premium OSRS services and categories",
      icon: <Settings className="h-6 w-6" />,
      href: "/services",
      color: "bg-gradient-to-r from-orange-600 to-red-600"
    },
    {
      title: "🗺️ Quest Management",
      description: "Configure elite quest services and premium pricing", 
      icon: <MapPin className="h-6 w-6" />,
      href: "/quest-management",
      color: "bg-gradient-to-r from-orange-600 to-red-600"
    },
    {
      title: "⚡ Training Methods",
      description: "Setup premium skill training services",
      icon: <Zap className="h-6 w-6" />,
      href: "/training-methods", 
      color: "bg-gradient-to-r from-orange-600 to-red-600"
    },
    {
      title: "🎁 Special Offers",
      description: "Create and manage exclusive Dragon deals",
      icon: <Gift className="h-6 w-6" />,
      href: "/special-offers",
      color: "bg-gradient-to-r from-orange-600 to-red-600"
    },
    {
      title: "📦 Order Management",
      description: "View and fulfill premium customer orders",
      icon: <ShoppingCart className="h-6 w-6" />,
      href: "/orders",
      color: "bg-gradient-to-r from-orange-600 to-red-600"
    },
    {
      title: "💰 Wallet Management",
      description: "Manage customer wallets and GP transactions",
      icon: <Wallet className="h-6 w-6" />,
      href: "/admin/wallets",
      color: "bg-gradient-to-r from-orange-600 to-red-600"
    },
    {
      title: "🛡️ Vouch Management",
      description: "Moderate user vouches and reputation system",
      icon: <Shield className="h-6 w-6" />,
      href: "/admin/vouches",
      color: "bg-gradient-to-r from-orange-600 to-red-600"
    },
    {
      title: "💵 GP Rates",
      description: "Configure buying and selling GP rates",
      icon: <DollarSign className="h-6 w-6" />,
      href: "/admin/gp-rates",
      color: "bg-gradient-to-r from-orange-600 to-red-600"
    },
    {
      title: "💳 Payment Methods",
      description: "Manage payment addresses for !payment command",
      icon: <CreditCard className="h-6 w-6" />,
      href: "/admin/payment-methods",
      color: "bg-gradient-to-r from-orange-600 to-red-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-orange-800">
      {/* Dragon Services Header */}
      <div className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 text-white shadow-2xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="h-16 w-16 text-orange-200" />
              <div>
                <h1 className="text-5xl font-bold tracking-tight flex items-center gap-3">
                  🐲 Dragon Services
                  <Flame className="h-10 w-10 text-orange-300 animate-pulse" />
                </h1>
                <p className="text-orange-100 text-xl font-medium mt-2">
                  Elite OSRS Service Management Portal • Premium Admin Dashboard
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4 text-orange-100">
              <Crown className="h-8 w-8" />
              <span className="font-bold text-lg">Admin Panel</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="bg-gradient-to-r from-orange-800/50 to-red-800/50 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-orange-600/30">
            <h2 className="text-3xl font-bold text-orange-100 flex items-center gap-3 mb-3">
              <Swords className="h-8 w-8 text-orange-400" />
              Management Dashboard
            </h2>
            <p className="text-orange-200 text-lg">
              Comprehensive control center for your premium OSRS service empire
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managementSections.map((section) => (
            <Card key={section.href} className="bg-gradient-to-r from-orange-800/70 to-red-800/70 border-orange-600/50 hover:from-orange-700/70 hover:to-red-700/70 transition-all duration-200 shadow-xl backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${section.color} text-white shadow-lg border border-orange-500/30`}>
                    {section.icon}
                  </div>
                  <div>
                    <CardTitle className="text-orange-100 text-lg font-bold">{section.title}</CardTitle>
                    <CardDescription className="text-orange-200 text-sm">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to={section.href}>
                  <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border border-orange-500 shadow-lg transition-all duration-200 font-semibold">
                    🔥 Open Panel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-orange-800/60 to-red-800/60 border-orange-600/40 inline-block backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-orange-200">
                <Shield className="h-6 w-6 text-orange-400" />
                <span className="font-semibold">Dragon Services Admin • Elite Management Portal</span>
                <Flame className="h-5 w-5 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}