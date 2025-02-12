
import { Transaction } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NormalizedTransactionsProps {
  transactions: Transaction[];
}

export default function NormalizedTransactions({ transactions }: NormalizedTransactionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Normalized Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <Card key={transaction.id} className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Amount</div>
                  <div className="text-sm">${transaction.amount}</div>
                  
                  <div className="text-sm font-medium">Date</div>
                  <div className="text-sm">{new Date(transaction.date).toLocaleDateString()}</div>
                  
                  <div className="text-sm font-medium">Source</div>
                  <div className="text-sm">{transaction.source}</div>
                  
                  <div className="text-sm font-medium">Status</div>
                  <div className="text-sm">{transaction.status}</div>
                  
                  {transaction.memo && (
                    <>
                      <div className="text-sm font-medium">Memo</div>
                      <div className="text-sm">{transaction.memo}</div>
                    </>
                  )}
                  
                  {transaction.category && (
                    <>
                      <div className="text-sm font-medium">Category</div>
                      <div className="text-sm">{transaction.category}</div>
                    </>
                  )}
                  
                  <div className="text-sm font-medium">Metadata</div>
                  <div className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(transaction.metadata, null, 2)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
