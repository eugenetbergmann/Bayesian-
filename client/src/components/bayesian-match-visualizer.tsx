import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

type MatchFactor = {
  name: string;
  weight: number;
  value: number;
  explanation: string;
};

export default function BayesianMatchVisualizer() {
  const [matchFactors, setMatchFactors] = useState<MatchFactor[]>([
    { 
      name: "Amount", 
      weight: 0.4, 
      value: 0,
      explanation: "Exact match = 100%, otherwise scaled by difference" 
    },
    { 
      name: "Date", 
      weight: 0.3, 
      value: 0,
      explanation: "Days difference affects score (max 30 days)" 
    },
    { 
      name: "Memo", 
      weight: 0.3, 
      value: 0,
      explanation: "Based on common words between memos" 
    },
  ]);

  const [amount1, setAmount1] = useState("");
  const [amount2, setAmount2] = useState("");
  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");
  const [memo1, setMemo1] = useState("");
  const [memo2, setMemo2] = useState("");
  const [calculations, setCalculations] = useState<string[]>([]);

  const calculateMatch = () => {
    const newCalculations: string[] = [];

    // Amount calculation
    const amountMatch = calculateAmountSimilarity(amount1, amount2);
    newCalculations.push(`Amount Similarity: ${(amountMatch * 100).toFixed(1)}%`);
    if (amount1 && amount2) {
      const amt1 = parseFloat(amount1);
      const amt2 = parseFloat(amount2);
      newCalculations.push(`Amount Difference: $${Math.abs(amt1 - amt2).toFixed(2)}`);
    }

    // Date calculation
    const dateMatch = calculateDateSimilarity(date1, date2);
    newCalculations.push(`Date Similarity: ${(dateMatch * 100).toFixed(1)}%`);
    if (date1 && date2) {
      const days = Math.abs((new Date(date1).getTime() - new Date(date2).getTime()) / (1000 * 60 * 60 * 24));
      newCalculations.push(`Days Apart: ${days.toFixed(1)} days`);
    }

    // Memo calculation
    const memoMatch = calculateMemoSimilarity(memo1, memo2);
    newCalculations.push(`Memo Similarity: ${(memoMatch * 100).toFixed(1)}%`);
    if (memo1 && memo2) {
      const words1 = memo1.toLowerCase().split(/\s+/);
      const words2 = memo2.toLowerCase().split(/\s+/);
      const commonWords = words1.filter(word => words2.includes(word));
      newCalculations.push(`Common Words: ${commonWords.join(", ") || "None"}`);
    }

    setCalculations(newCalculations);

    setMatchFactors([
      { ...matchFactors[0], value: amountMatch },
      { ...matchFactors[1], value: dateMatch },
      { ...matchFactors[2], value: memoMatch },
    ]);
  };

  const calculateAmountSimilarity = (a1: string, a2: string) => {
    const amount1 = parseFloat(a1);
    const amount2 = parseFloat(a2);
    if (isNaN(amount1) || isNaN(amount2)) return 0;
    return amount1 === amount2 ? 1 : 1 - Math.min(Math.abs(amount1 - amount2) / Math.max(amount1, amount2), 1);
  };

  const calculateDateSimilarity = (d1: string, d2: string) => {
    if (!d1 || !d2) return 0;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    const diffDays = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 1 - diffDays / 30); // Scale based on 30 days difference
  };

  const calculateMemoSimilarity = (m1: string, m2: string) => {
    if (!m1 || !m2) return 0;
    const words1 = m1.toLowerCase().split(/\s+/);
    const words2 = m2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  };

  const totalConfidence = matchFactors.reduce(
    (acc, factor) => acc + factor.value * factor.weight,
    0
  ) * 100;

  const getConfidenceColor = (value: number) => {
    if (value >= 85) return "bg-emerald-500";
    if (value >= 60) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getConfidenceLabel = (value: number) => {
    if (value >= 85) return "High Confidence";
    if (value >= 60) return "Medium Confidence";
    return "Low Confidence";
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Match Confidence Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold mb-4 text-primary">
            {totalConfidence.toFixed(1)}%
            <span className="text-lg ml-2 font-normal text-muted-foreground">
              ({getConfidenceLabel(totalConfidence)})
            </span>
          </div>
          <Progress 
            value={totalConfidence} 
            className="h-3 rounded-full bg-slate-200"
            indicatorClassName={getConfidenceColor(totalConfidence)}
          />
          <div className="mt-6 space-y-4">
            {matchFactors.map((factor) => (
              <div key={factor.name} className="bg-card rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">
                    {factor.name} (Weight: {(factor.weight * 100).toFixed()}%)
                  </span>
                  <span className="text-primary">{(factor.value * 100).toFixed(1)}%</span>
                </div>
                <Progress 
                  value={factor.value * 100} 
                  className="h-2 rounded-full bg-slate-200"
                  indicatorClassName={getConfidenceColor(factor.value * 100)}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {factor.explanation}
                </p>
              </div>
            ))}
          </div>

          {calculations.length > 0 && (
            <>
              <Separator className="my-6" />
              <div className="space-y-2">
                <h3 className="font-medium">Detailed Calculations</h3>
                {calculations.map((calc, index) => (
                  <p key={index} className="text-sm text-muted-foreground">
                    {calc}
                  </p>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Transaction 1</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input
                value={amount1}
                onChange={(e) => setAmount1(e.target.value)}
                placeholder="Enter amount"
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={date1}
                onChange={(e) => setDate1(e.target.value)}
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Memo</label>
              <Input
                value={memo1}
                onChange={(e) => setMemo1(e.target.value)}
                placeholder="Enter memo"
                className="bg-card"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Transaction 2</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input
                value={amount2}
                onChange={(e) => setAmount2(e.target.value)}
                placeholder="Enter amount"
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={date2}
                onChange={(e) => setDate2(e.target.value)}
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Memo</label>
              <Input
                value={memo2}
                onChange={(e) => setMemo2(e.target.value)}
                placeholder="Enter memo"
                className="bg-card"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={calculateMatch}
        className="w-full py-6 text-lg font-semibold bg-primary hover:bg-primary/90 text-white"
      >
        Calculate Match Probability
      </Button>
    </div>
  );
}