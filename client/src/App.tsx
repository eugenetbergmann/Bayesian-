import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Switch, Route, Link } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import SystemFlowVisualizer from "@/components/system-flow-visualizer";
import { ProtectedRoute } from "./lib/protected-route";
import { MenubarMenu, Menubar, MenubarContent, MenubarItem, MenubarTrigger } from "@/components/ui/menubar";

function Navigation() {
  return (
    <Menubar className="fixed top-0 left-0 right-0 z-50 border-b">
      <MenubarMenu>
        <MenubarTrigger>Navigation</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <Link href="/">Dashboard</Link>
          </MenubarItem>
          <MenubarItem>
            <Link href="/flow">System Flow</Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

function Router() {
  return (
    <>
      <Navigation />
      <main className="pt-16">
        <Switch>
          <ProtectedRoute path="/" component={Dashboard} />
          <Route path="/flow" component={SystemFlowVisualizer} />
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;