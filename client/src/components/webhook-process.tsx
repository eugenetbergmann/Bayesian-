import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, ArrowRight, Database, GitCompare } from "lucide-react";

type ProcessStep = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const steps: ProcessStep[] = [
  {
    icon: <Database className="h-6 w-6" />,
    title: "Data Ingestion",
    description: "Daily transaction data is received from Housecall Pro, QuickBooks, and Plaid via webhooks",
  },
  {
    icon: <GitCompare className="h-6 w-6" />,
    title: "Match Processing",
    description: "Bayesian reasoning and Monte Carlo simulations calculate match probabilities",
  },
  {
    icon: <BadgeCheck className="h-6 w-6" />,
    title: "Automated Decisions",
    description: "Transactions with high confidence (>85%) are automatically matched",
  },
];

export default function WebhookProcess() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Process Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start mb-8 last:mb-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                {step.icon}
              </div>
              <ArrowRight className="mx-4 h-6 w-6 flex-shrink-0 text-muted-foreground" />
              <div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
