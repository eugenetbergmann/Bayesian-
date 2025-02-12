import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import BayesianMatchVisualizer from "@/components/bayesian-match-visualizer";
import WebhookProcess from "@/components/webhook-process";
import TransactionList from "@/components/transaction-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type TabType = "overview" | "bayesian" | "webhook" | "housecall";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/housecall/sync-invoices");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Successfully synced Housecall Pro invoices",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync invoices",
        variant: "destructive",
      });
    },
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
              <Button
                variant={activeTab === "housecall" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("housecall")}
              >
                Housecall Pro
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

          {activeTab === "housecall" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Housecall Pro Invoice Sync</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Sync paid invoices from Housecall Pro to match with your transactions.
                  </p>
                  <Button
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {syncMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync Invoices
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}