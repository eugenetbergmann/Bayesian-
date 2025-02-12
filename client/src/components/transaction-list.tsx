import { useMutation } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle } from "lucide-react";

interface TransactionListProps {
  transactions: Transaction[];
  canApprove: boolean;
}

export default function TransactionList({ transactions, canApprove }: TransactionListProps) {
  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "approved" | "rejected" }) => {
      const res = await apiRequest("POST", `/api/transactions/${id}/review`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="py-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">
                  ${transaction.amount.toString()} - {transaction.source}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(transaction.date).toLocaleDateString()}
                </div>
                {transaction.memo && (
                  <div className="text-sm text-muted-foreground">
                    Memo: {transaction.memo}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {transaction.matchProbability && (
                  <div className="text-sm font-medium">
                    {(transaction.matchProbability * 100).toFixed(1)}%
                  </div>
                )}
                {canApprove && transaction.reviewStatus === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        reviewMutation.mutate({
                          id: transaction.id,
                          status: "approved",
                        })
                      }
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        reviewMutation.mutate({
                          id: transaction.id,
                          status: "rejected",
                        })
                      }
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
