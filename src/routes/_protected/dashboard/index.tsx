import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useCurrentUser from "#/hooks/use-current-user";
import { fetchDashboardSummary, fetchBudgetStatus, fetchCashflow } from "#/features/dashboard/data-access";
import { Card, CardHeader, CardTitle, CardContent } from "#/components/ui/card";
import { Progress } from "#/components/ui/progress";
import { ChartContainer, ChartTooltip } from "#/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_protected/dashboard/")({
	component: RouteComponent,
});

function RouteComponent() {
  const currentUser = useCurrentUser();
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary", currentUser?.id],
    queryFn: () => fetchDashboardSummary(currentUser),
    enabled: Boolean(currentUser?.id),
  });
  const budgetQuery = useQuery({
    queryKey: ["dashboard", "budgetStatus", currentUser?.id],
    queryFn: () => fetchBudgetStatus(currentUser),
    enabled: Boolean(currentUser?.id),
  });
  const cashflowQuery = useQuery({
    queryKey: ["dashboard", "cashflow", currentUser?.id],
    queryFn: () => fetchCashflow(currentUser),
    enabled: Boolean(currentUser?.id),
  });

  const summary = summaryQuery.data?.summary;
  const budgetStatus = budgetQuery.data?.budgetStatus ?? [];
  const cashflow = cashflowQuery.data?.cashflow ?? [];
  const fmt = (val: string | number) =>
    Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-8 p-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Net Worth</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
             {summaryQuery.isLoading
               ? '…'
               : summaryQuery.error
               ? 'Error'
               : fmt(String(summary?.netWorth ?? "0"))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current Cash</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
             {fmt(String(summary?.currentCash ?? "0"))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Remaining Budget</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
             {fmt(String(summary?.remainingBudget ?? "0"))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Savings</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
             {fmt(String(summary?.monthlySavings ?? "0"))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetQuery.isLoading
              ? <p>Loading…</p>
              : budgetQuery.error
              ? <p>Error loading</p>
               : budgetStatus.map((b) => (
                <div key={String(b.groupId)} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{String(b.groupName)}</span>
                    <span className="text-sm text-muted-foreground">{String(b.percent)}%</span>
                  </div>
                  <Progress value={parseFloat(String(b.percent))} />
                </div>
               ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Cashflow</CardTitle>
          </CardHeader>
          <CardContent>
            {cashflowQuery.isLoading
              ? <p>Loading…</p>
              : cashflowQuery.error
              ? <p>Error loading</p>
              : (
                <ChartContainer
                  id="cashflow"
                  config={{ net: { label: 'Net Cash', color: '#0ea5e9' } }}
                  className="w-full h-56"
                >
                  <LineChart data={cashflow}>
                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d).getUTCDate().toString()} />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Line dataKey="net" stroke="var(--color-net)" strokeWidth={2} dot={false} />
                    <ChartTooltip />
                  </LineChart>
                </ChartContainer>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
