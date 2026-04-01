import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const AI: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">Live operations summary and assistant entry point</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-8">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-heading font-semibold">Assistant workspace</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Live view: {data?.stats.dailyPatients || 0} patients today, {data?.stats.appointments || 0} scheduled appointments, and {data?.stats.pendingLabs || 0} pending labs.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  toast.message("Daily summary generated", {
                    description: data
                      ? `Revenue Rs ${data.stats.revenue.toLocaleString()}, ${data.stats.dailyPatients} patients, ${data.stats.pendingLabs} pending labs.`
                      : "Dashboard data is still loading.",
                  })
                }
              >
                <Sparkles className="mr-1 h-4 w-4" /> Generate daily summary
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AI;
