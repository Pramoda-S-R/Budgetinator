import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import useCurrentUser from "#/hooks/use-current-user";
import {
  fetchSpendingTrends,
  fetchCategoryBreakdown,
  fetchAnalyticsCashflow,
  fetchNetworthHistory,
} from "#/features/analytics/data-access";
import { Card, CardHeader, CardTitle, CardContent } from "#/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "#/components/ui/select";

export const Route = createFileRoute("/_protected/analytics/")({
  component: AnalyticsPage,
});

const CHART_COLORS = ["#4ade80", "#60a5fa", "#facc15", "#f87171", "#a78bfa", "#fb923c", "#34d399", "#e879f9"];

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const BAR_CURSOR_STYLE = { fill: "hsl(var(--muted))", opacity: 0.5 };

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "hsl(var(--popover))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "6px",
        padding: "8px 12px",
        fontSize: "13px",
      }}
    >
      {label && (
        <p style={{ color: "hsl(var(--popover-foreground))", marginBottom: "6px", fontWeight: 500 }}>
          {label}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {payload.map((entry, i) => (
          <span
            key={i}
            style={{
              display: "block",
              color: "hsl(var(--popover-foreground))",
            }}
          >
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const user = useCurrentUser();
  const now = new Date();
  const [breakdownYear, setBreakdownYear] = useState(now.getFullYear());
  const [breakdownMonth, setBreakdownMonth] = useState(now.getMonth() + 1);
  const [trendMonths, setTrendMonths] = useState(6);
  const [cashflowMonths, setCashflowMonths] = useState(12);

  const trendsQ = useQuery({
    queryKey: ["analytics", "trends", user?.id, trendMonths],
    queryFn: () => fetchSpendingTrends(trendMonths, user),
    enabled: Boolean(user?.id),
  });

  const breakdownQ = useQuery({
    queryKey: ["analytics", "breakdown", user?.id, breakdownYear, breakdownMonth],
    queryFn: () => fetchCategoryBreakdown(breakdownYear, breakdownMonth, user),
    enabled: Boolean(user?.id),
  });

  const cashflowQ = useQuery({
    queryKey: ["analytics", "cashflow", user?.id, cashflowMonths],
    queryFn: () => fetchAnalyticsCashflow(cashflowMonths, user),
    enabled: Boolean(user?.id),
  });

  const networthQ = useQuery({
    queryKey: ["analytics", "networth", user?.id],
    queryFn: () => fetchNetworthHistory(12, user),
    enabled: Boolean(user?.id),
  });

  // Pivot spending trends into monthly chart data: [{label, cat1, cat2, ...}]
  const trendsData = (() => {
    const rows = trendsQ.data?.trends ?? [];
    const monthMap = new Map<string, Record<string, string | number>>();
    for (const r of rows) {
      const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
      if (!monthMap.has(key)) monthMap.set(key, { label: `${MONTH_NAMES[r.month]} ${r.year}` });
      const entry = monthMap.get(key)!;
      entry[r.categoryName ?? "Uncategorized"] = Number(r.total);
    }
    return Array.from(monthMap.values());
  })();

  const categoryNames = [...new Set((trendsQ.data?.trends ?? []).map((r: any) => r.categoryName ?? "Uncategorized"))];

  const cashflow = cashflowQ.data?.cashflow ?? [];
  const cashflowChart = cashflow.map((r: any) => ({
    label: `${MONTH_NAMES[r.month]} ${r.year}`,
    income: Number(r.income),
    expense: Number(r.expense),
    net: Number(r.net),
    savingsRate: r.savingsRate,
  }));

  const networthHistory = (networthQ.data?.history ?? []).map((r: any) => ({
    date: r.date,
    netWorth: Number(r.netWorth),
  }));

  const breakdown = breakdownQ.data?.breakdown ?? [];

  // Year options: current year and last 2
  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-semibold">Analytics</h1>

      {/* Category breakdown (pie chart) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Category Breakdown</CardTitle>
            <div className="flex gap-2">
              <Select value={String(breakdownYear)} onValueChange={(v) => setBreakdownYear(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(breakdownMonth)} onValueChange={(v) => setBreakdownMonth(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.slice(1).map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {breakdownQ.isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : breakdown.length === 0 ? (
            <p className="text-muted-foreground">No expense data for this period.</p>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={breakdown} dataKey="percent" nameKey="categoryName" outerRadius={90}>
                    {breakdown.map((_: any, idx: number) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={(p) => <ChartTooltip {...(p as any)} formatter={(v) => `${Number(v)}%`} />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {breakdown.map((r: any, idx: number) => (
                  <div key={r.categoryId ?? idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span>{r.categoryName ?? "Uncategorized"}</span>
                      {r.groupName && <span className="text-muted-foreground text-xs">({r.groupName})</span>}
                    </div>
                    <div className="flex gap-3">
                      <span className="font-medium">
                        {Number(r.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-muted-foreground">{r.percent}%</span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between font-semibold text-sm">
                  <span>Total</span>
                  <span>
                    {Number(breakdownQ.data?.grandTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly spending trends (stacked bar) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Spending Trends</CardTitle>
            <Select value={String(trendMonths)} onValueChange={(v) => setTrendMonths(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 months</SelectItem>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {trendsQ.isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : trendsData.length === 0 ? (
            <p className="text-muted-foreground">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip content={(p) => <ChartTooltip {...(p as any)} />} cursor={BAR_CURSOR_STYLE} />
                <Legend />
                {categoryNames.map((cat, idx) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="a"
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Cashflow (income vs expense) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Monthly Cashflow</CardTitle>
            <Select value={String(cashflowMonths)} onValueChange={(v) => setCashflowMonths(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
                <SelectItem value="24">24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {cashflowQ.isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : cashflowChart.length === 0 ? (
            <p className="text-muted-foreground">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cashflowChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip content={(p) => <ChartTooltip {...(p as any)} />} cursor={BAR_CURSOR_STYLE} />
                <Legend />
                <Bar dataKey="income" fill="#4ade80" name="Income" />
                <Bar dataKey="expense" fill="#f87171" name="Expense" />
                <Line type="monotone" dataKey="net" stroke="#60a5fa" name="Net" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Net worth history */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth History</CardTitle>
        </CardHeader>
        <CardContent>
          {networthQ.isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : networthHistory.length === 0 ? (
            <p className="text-muted-foreground">No balance history yet. Update account balances to track net worth over time.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={networthHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
                <YAxis />
                <Tooltip content={(p) => <ChartTooltip {...(p as any)} formatter={(v) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })} />} />
                <Line type="monotone" dataKey="netWorth" stroke="#60a5fa" strokeWidth={2} dot={false} name="Net Worth" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
