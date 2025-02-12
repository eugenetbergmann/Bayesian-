import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface TransactionListProps {
  transactions: Transaction[];
  canApprove: boolean;
}

export default function TransactionList({ transactions, canApprove }: TransactionListProps) {
  const [feedbackDialog, setFeedbackDialog] = useState<{
    isOpen: boolean;
    transactionId: number | null;
    status: "approved" | "rejected";
  }>({ isOpen: false, transactionId: null, status: "approved" });
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, feedback }: { 
      id: number; 
      status: "approved" | "rejected";
      feedback?: string;
    }) => {
      const res = await apiRequest("POST", `/api/transactions/${id}/review`, { status, feedback });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Review submitted",
        description: "Transaction has been updated successfully.",
      });
      setFeedbackDialog({ isOpen: false, transactionId: null, status: "approved" });
      setFeedback("");
    },
    onError: (error: Error) => {
      toast({
        title: "Review failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (probability: number | null) => {
    if (!probability) return "text-gray-500";
    if (probability >= 0.85) return "text-emerald-500";
    if (probability >= 0.60) return "text-amber-500";
    return "text-rose-500";
  };

  const handleReview = (id: number, status: "approved" | "rejected") => {
    setFeedbackDialog({ isOpen: true, transactionId: id, status });
  };

  const submitReview = () => {
    if (!feedbackDialog.transactionId) return;

    reviewMutation.mutate({
      id: feedbackDialog.transactionId,
      status: feedbackDialog.status,
      feedback: feedback.trim() || undefined,
    });
  };

  const pendingCount = transactions.filter(t => t.reviewStatus === "pending").length;
  const approvedCount = transactions.filter(t => t.reviewStatus === "approved").length;
  const automationRate = transactions.length ? 
    (approvedCount / transactions.length) * 100 : 0;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingCount}
              <AlertTriangle className="h-4 w-4 text-amber-500 inline ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {approvedCount}
              <CheckCircle className="h-4 w-4 text-emerald-500 inline ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Automation Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {automationRate.toFixed(1)}%
              <Info className="h-4 w-4 text-primary inline ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

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
                  {transaction.matchedTransactionId && (
                    <div className="text-sm font-medium text-primary">
                      Matched with Transaction #{transaction.matchedTransactionId}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {transaction.matchProbability && (
                    <div className={`text-sm font-medium ${getStatusColor(transaction.matchProbability)}`}>
                      {(transaction.matchProbability * 100).toFixed(1)}%
                    </div>
                  )}
                  {canApprove && transaction.reviewStatus === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReview(transaction.id, "approved")}
                      >
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReview(transaction.id, "rejected")}
                      >
                        <XCircle className="h-4 w-4 text-rose-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog 
        open={feedbackDialog.isOpen} 
        onOpenChange={(open) => !open && setFeedbackDialog(d => ({ ...d, isOpen: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {feedbackDialog.status === "approved" ? "Approve" : "Reject"} Transaction
            </DialogTitle>
            <DialogDescription>
              Please provide any additional feedback about this decision. This helps improve our matching algorithm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Optional feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[100px]"
            />
            <Button 
              onClick={submitReview}
              className="w-full"
              disabled={reviewMutation.isPending}
            >
              Submit Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}