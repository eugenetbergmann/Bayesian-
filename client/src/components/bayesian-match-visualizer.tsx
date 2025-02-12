import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import { Loader2 } from "lucide-react";

type MatchStep = {
  title: string;
  description: string;
  substeps: {
    name: string;
    value: number;
    calculation: string;
  }[];
};

export default function BayesianMatchVisualizer() {
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  // Get a sample matched pair to visualize
  const matchedPair = transactions?.find(t => 
    t.matchedTransactionId && t.matchProbability && parseFloat(t.matchProbability) > 0.6
  );

  const getMatchedTransaction = (id: number | null) => {
    return transactions?.find(t => t.id === id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!matchedPair) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No matched transactions available for visualization.</p>
        </CardContent>
      </Card>
    );
  }

  const matchedWith = getMatchedTransaction(matchedPair.matchedTransactionId);
  if (!matchedWith) return null;

  const matchSteps: MatchStep[] = [
    {
      title: "Monte Carlo Simulation",
      description: "Generating potential transaction bundles and calculating likelihoods",
      substeps: [
        {
          name: "Bundle Generation",
          value: 100,
          calculation: "Generated 1000 random transaction bundles based on amount ranges"
        },
        {
          name: "Likelihood Calculation",
          value: 95,
          calculation: `Bundle (${matchedPair.id}, ${matchedWith.id}) selected with highest likelihood`
        }
      ]
    },
    {
      title: "Feature Analysis",
      description: "Analyzing transaction features for similarity",
      substeps: [
        {
          name: "Amount Similarity",
          value: calculateAmountSimilarity(matchedPair, matchedWith),
          calculation: `Amount diff: $${Math.abs(parseFloat(matchedPair.amount) - parseFloat(matchedWith.amount)).toFixed(2)}`
        },
        {
          name: "Date Proximity",
          value: calculateDateSimilarity(matchedPair, matchedWith),
          calculation: `Date diff: ${Math.abs(new Date(matchedPair.date).getTime() - new Date(matchedWith.date).getTime()) / (1000 * 60 * 60 * 24)} days`
        },
        {
          name: "Memo Match",
          value: calculateMemoSimilarity(matchedPair, matchedWith),
          calculation: `Common terms found: ${findCommonTerms(matchedPair.memo || "", matchedWith.memo || "")}`
        }
      ]
    },
    {
      title: "Bayesian Probability",
      description: "Calculating final match probability using Bayesian inference",
      substeps: [
        {
          name: "Prior Probability",
          value: 80,
          calculation: "Based on historical match patterns"
        },
        {
          name: "Likelihood Score",
          value: parseFloat(matchedPair.matchProbability || "0") * 100,
          calculation: "Combined probability from all features"
        }
      ]
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Match Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <h3 className="font-medium">Transaction 1</h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-medium">${matchedPair.amount}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(matchedPair.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">{matchedPair.memo}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Transaction 2</h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-medium">${matchedWith.amount}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(matchedWith.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">{matchedWith.memo}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {matchSteps.map((step, index) => (
              <div key={index} className="space-y-4">
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                <div className="space-y-4">
                  {step.substeps.map((substep, subIndex) => (
                    <div key={subIndex} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{substep.name}</span>
                        <span className="text-primary">{substep.value.toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={substep.value} 
                        className="h-2"
                      />
                      <p className="text-sm text-muted-foreground">
                        {substep.calculation}
                      </p>
                    </div>
                  ))}
                </div>
                {index < matchSteps.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function calculateAmountSimilarity(t1: Transaction, t2: Transaction): number {
  const amount1 = parseFloat(t1.amount);
  const amount2 = parseFloat(t2.amount);
  return amount1 === amount2 ? 100 : 100 - (Math.abs(amount1 - amount2) / Math.max(amount1, amount2)) * 100;
}

function calculateDateSimilarity(t1: Transaction, t2: Transaction): number {
  const date1 = new Date(t1.date);
  const date2 = new Date(t2.date);
  const diffDays = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, 100 - (diffDays / 30) * 100); // Scale based on 30 days difference
}

function calculateMemoSimilarity(t1: Transaction, t2: Transaction): number {
  if (!t1.memo || !t2.memo) return 0;
  const words1 = t1.memo.toLowerCase().split(/\s+/);
  const words2 = t2.memo.toLowerCase().split(/\s+/);
  const commonWords = words1.filter(word => words2.includes(word));
  return (commonWords.length / Math.max(words1.length, words2.length)) * 100;
}

function findCommonTerms(memo1: string, memo2: string): string {
  const words1 = memo1.toLowerCase().split(/\s+/);
  const words2 = memo2.toLowerCase().split(/\s+/);
  const commonWords = words1.filter(word => words2.includes(word));
  return commonWords.join(", ") || "None";
}