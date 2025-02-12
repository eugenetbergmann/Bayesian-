import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@shared/schema";
import { Loader2, ArrowRight, Database, Cog, BarChart3, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SystemFlowVisualizer() {
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Calculate statistics for each stage
  const stats = {
    plaid: transactions?.filter(t => t.source === 'plaid').length || 0,
    quickbooks: transactions?.filter(t => t.source === 'quickbooks').length || 0,
    housecall: transactions?.filter(t => t.source === 'housecall').length || 0,
    matched: transactions?.filter(t => t.matchedTransactionId !== null).length || 0,
    reviewed: transactions?.filter(t => t.reviewStatus === 'approved').length || 0,
  };

  const stages = [
    {
      title: "Data Ingestion",
      description: "APIs pull transactions from multiple sources",
      icon: <Database className="h-8 w-8" />,
      stats: [
        { label: "Plaid", value: stats.plaid },
        { label: "QuickBooks", value: stats.quickbooks },
        { label: "HouseCall", value: stats.housecall },
      ]
    },
    {
      title: "Normalization",
      description: "Standardize data format across sources",
      icon: <Cog className="h-8 w-8" />,
      stats: [
        { 
          label: "Total Normalized", 
          value: stats.plaid + stats.quickbooks + stats.housecall 
        }
      ]
    },
    {
      title: "Matching Engine",
      description: "Bayesian & Monte Carlo analysis",
      icon: <BarChart3 className="h-8 w-8" />,
      stats: [
        { label: "Matched Pairs", value: stats.matched },
      ]
    },
    {
      title: "Review Process",
      description: "Human verification of matches",
      icon: <Check className="h-8 w-8" />,
      stats: [
        { label: "Approved", value: stats.reviewed },
      ]
    }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            System Process Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Flow lines - Hidden on mobile */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted-foreground/20 hidden md:block" />

            {/* Stages */}
            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stages.map((stage, index) => (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex flex-col items-center gap-4 p-4 md:p-6 bg-card rounded-lg border">
                        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          {stage.icon}
                        </div>
                        <div className="text-center">
                          <h3 className="font-semibold">{stage.title}</h3>
                          <div className="mt-2 space-y-1">
                            {stage.stats.map((stat, i) => (
                              <p key={i} className="text-sm text-muted-foreground">
                                {stat.label}: <span className="font-medium text-foreground">{stat.value}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                        {/* Flow arrows - Hidden on mobile */}
                        {index < stages.length - 1 && (
                          <ArrowRight className="absolute -right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hidden md:block" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{stage.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* Sample Data Notice */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Demo Mode:</strong> This visualization includes synthetic test data to demonstrate the system's capabilities. 
              The data shows transactions flowing through each stage of the process, from initial ingestion to final review.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}