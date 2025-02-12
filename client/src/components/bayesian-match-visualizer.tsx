import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type MatchFactor = {
  name: string;
  weight: number;
  value: number;
};

export default function BayesianMatchVisualizer() {
  const [matchFactors, setMatchFactors] = useState<MatchFactor[]>([
    { name: "Amount", weight: 0.4, value: 0 },
    { name: "Date", weight: 0.3, value: 0 },
    { name: "Memo", weight: 0.3, value: 0 },
  ]);

  const [amount1, setAmount1] = useState("");
  const [amount2, setAmount2] = useState("");
  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");
  const [memo1, setMemo1] = useState("");
  const [memo2, setMemo2] = useState("");

  const calculateMatch = () => {
    // Simple match calculation for demo
    const amountMatch = amount1 === amount2 ? 1 : 0;
    const dateMatch = date1 === date2 ? 1 : 0;
    const memoMatch = memo1.toLowerCase() === memo2.toLowerCase() ? 1 : 0;

    setMatchFactors([
      { ...matchFactors[0], value: amountMatch },
      { ...matchFactors[1], value: dateMatch },
      { ...matchFactors[2], value: memoMatch },
    ]);
  };

  const totalConfidence = matchFactors.reduce(
    (acc, factor) => acc + factor.value * factor.weight,
    0
  ) * 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Match Confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-4">{totalConfidence.toFixed(1)}%</div>
          <Progress value={totalConfidence} className="h-2" />
          <div className="mt-6 space-y-4">
            {matchFactors.map((factor) => (
              <div key={factor.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{factor.name}</span>
                  <span>{(factor.value * 100).toFixed(1)}%</span>
                </div>
                <Progress value={factor.value * 100} className="h-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transaction 1</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm">Amount</label>
              <Input
                value={amount1}
                onChange={(e) => setAmount1(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="text-sm">Date</label>
              <Input
                type="date"
                value={date1}
                onChange={(e) => setDate1(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm">Memo</label>
              <Input
                value={memo1}
                onChange={(e) => setMemo1(e.target.value)}
                placeholder="Enter memo"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction 2</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm">Amount</label>
              <Input
                value={amount2}
                onChange={(e) => setAmount2(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="text-sm">Date</label>
              <Input
                type="date"
                value={date2}
                onChange={(e) => setDate2(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm">Memo</label>
              <Input
                value={memo2}
                onChange={(e) => setMemo2(e.target.value)}
                placeholder="Enter memo"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={calculateMatch}
        className="w-full bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600"
      >
        Calculate Match
      </Button>
    </div>
  );
}
