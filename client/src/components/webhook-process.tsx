import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, ArrowRight, Database, GitCompare, AlertCircle } from "lucide-react";

type ProcessStep = {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "active" | "completed" | "pending";
};

export default function WebhookProcess() {
  const steps: ProcessStep[] = [
    {
      icon: <Database className="h-6 w-6" />,
      title: "Data Integration",
      description: "Receiving transaction data from Housecall Pro, QuickBooks, and Plaid via webhooks",
      status: "active",
    },
    {
      icon: <GitCompare className="h-6 w-6" />,
      title: "Intelligent Matching",
      description: "Processing using Bayesian reasoning and Monte Carlo simulations",
      status: "pending",
    },
    {
      icon: <BadgeCheck className="h-6 w-6" />,
      title: "Automated Review",
      description: "High-confidence matches (>85%) are automatically processed",
      status: "pending",
    },
    {
      icon: <AlertCircle className="h-6 w-6" />,
      title: "Manual Review",
      description: "Lower confidence matches are flagged for manual review",
      status: "pending",
    },
  ];

  return (
    <Card className="max-w-4xl mx-auto border-none shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold">Transaction Processing Pipeline</CardTitle>
        <p className="text-muted-foreground">
          Real-time visualization of the automated matching process
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className={`flex items-start mb-8 last:mb-0 transition-opacity duration-300
                ${step.status === "pending" ? "opacity-50" : "opacity-100"}`}
            >
              <div className={`
                flex-shrink-0 w-12 h-12 rounded-full 
                ${step.status === "completed" ? "bg-primary/20" : "bg-primary/10"}
                flex items-center justify-center
                transition-colors duration-300
              `}>
                {step.icon}
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="mx-4 h-6 w-6 flex-shrink-0 text-muted-foreground mt-3" />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-medium mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
                {step.status === "active" && (
                  <div className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                    Processing...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}