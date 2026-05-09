import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { History, Search, RefreshCcw } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const ActivityLogs = () => {
  const [query, setQuery] = React.useState("");

  useEffect(() => {
    document.title = "Activity Logs | Siara Dental";
  }, []);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => api.getActivityLogs(),
  });

  const filteredLogs = React.useMemo(() => {
    if (!data) return [];
    return data.filter((log) => 
      log.userName.toLowerCase().includes(query.toLowerCase()) ||
      log.action.toLowerCase().includes(query.toLowerCase()) ||
      log.details.toLowerCase().includes(query.toLowerCase())
    );
  }, [data, query]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Activity Logs</h1>
          <p className="text-sm text-muted-foreground">Monitor system events, logins, and data changes</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <History className="mx-auto h-12 w-12 opacity-20 mb-3" />
              <p>No activity logs found</p>
            </div>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-medium text-muted-foreground">
                        {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{log.userName}</span>
                          <span className="text-[10px] text-muted-foreground">{log.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.action === 'Login' ? 'bg-success/10 text-success' : 
                          log.action.includes('Delete') ? 'bg-destructive/10 text-destructive' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm max-w-md truncate" title={log.details}>
                        {log.details}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground font-mono">
                        {log.ip || "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ActivityLogs;
