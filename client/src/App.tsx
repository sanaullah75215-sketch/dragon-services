import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import Home from "@/pages/home";
import Management from "@/pages/Management";
import BotManagement from "@/pages/bot-management";
import ServiceManagement from "@/pages/service-management";
import TrainingMethods from "@/pages/training-methods";
import QuestManagement from "@/pages/quest-management";
import SpecialOffersPage from "@/pages/SpecialOffersPage";
import WalletPage from "@/pages/WalletPage";
import AdminWalletManagement from "@/pages/AdminWalletManagement";
import VouchManagement from "@/pages/VouchManagement";
import OrdersPage from "@/pages/OrdersPage";
import CreateOrderPage from "@/pages/CreateOrderPage";
import GpRatesPage from "@/pages/GpRatesPage";
import PaymentMethodsPage from "@/pages/PaymentMethodsPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/management" component={Management} />
      <Route path="/bot-management" component={BotManagement} />
      <Route path="/services" component={ServiceManagement} />
      <Route path="/training-methods" component={TrainingMethods} />
      <Route path="/quest-management" component={QuestManagement} />
      <Route path="/special-offers" component={SpecialOffersPage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/admin/wallets" component={AdminWalletManagement} />
      <Route path="/admin/vouches" component={VouchManagement} />
      <Route path="/admin/gp-rates" component={GpRatesPage} />
      <Route path="/admin/payment-methods" component={PaymentMethodsPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/create-order" component={CreateOrderPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
