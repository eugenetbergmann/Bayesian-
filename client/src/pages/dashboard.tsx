import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import BayesianMatchVisualizer from "@/components/bayesian-match-visualizer";
import WebhookProcess from "@/components/webhook-process";
import TransactionList from "@/components/transaction-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type TabType = "overview" | "bayesian" | "webhook";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { user, logoutMutation } = useAuth();
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pendingTransactions = transactions?.filter(t => t.reviewStatus === "pending") || [];
  const automationRate = transactions?.length ? 
    (transactions.filter(t => t.reviewStatus === "approved").length / transactions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-card border-r">
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold">Transaction Matcher</h2>
            <nav className="space-y-2">
              <Button
                variant={activeTab === "overview" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </Button>
              <Button
                variant={activeTab === "bayesian" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("bayesian")}
              >
                Bayesian Match
              </Button>
              <Button
                variant={activeTab === "webhook" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("webhook")}
              >
                Webhook Process
              </Button>
            </nav>
            <div className="pt-6 border-t">
              <div className="text-sm text-muted-foreground mb-2">
                Logged in as {user?.username}
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => logoutMutation.mutate()}
              >
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {pendingTransactions.length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Automation Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {automationRate.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>
              <TransactionList 
                transactions={transactions || []}
                canApprove={user?.role === "approver"}
              />
            </div>
          )}

          {activeTab === "bayesian" && (
            <BayesianMatchVisualizer />
          )}

          {activeTab === "webhook" && (
            <WebhookProcess />
          )}
        </main>
      </div>
    </div>
  );
}
