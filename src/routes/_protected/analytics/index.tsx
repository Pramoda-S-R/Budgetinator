import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "#/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { createAnalyticsDataAccess } from "#/features/analytics/data-access";
import useCurrentUser from "#/hooks/use-current-user";

export const Route = createFileRoute("/_protected/analytics/")({
	loader: () => {
		const now = new Date();
		return {
			initialYear: now.getFullYear(),
			initialMonth: now.getMonth() + 1,
		};
	},
	component: AnalyticsPage,
});

const CHART_COLORS = [
	"#4ade80",
	"#60a5fa",
	"#facc15",
	"#f87171",
	"#a78bfa",
	"#fb923c",
	"#34d399",
	"#e879f9",
];

const MONTH_NAMES = [
	"",
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

const BAR_CURSOR_STYLE = { fill: "hsl(var(--muted))", opacity: 0.5 };

function renderTooltipEntry(
	value: unknown,
	name: unknown,
	entryColor: string,
	formatValue?: (value: unknown) => string,
) {
	const numericValue = Number(value ?? 0);
	const renderedValue = formatValue
		? formatValue(value)
		: numericValue.toLocaleString(undefined, { maximumFractionDigits: 2 });

	return (
		<div className="flex w-full items-center justify-between gap-3">
			<span className="font-medium" style={{ color: entryColor }}>
				{String(name ?? "Value")}
			</span>
			<span
				className="font-mono font-semibold tabular-nums"
				style={{ color: entryColor }}
			>
				{renderedValue}
			</span>
		</div>
	);
}

function AnalyticsPage() {
	const { initialYear, initialMonth } = Route.useLoaderData();
	const user = useCurrentUser();
	const analyticsApi = useMemo(() => createAnalyticsDataAccess(user), [user]);
	const [breakdownYear, setBreakdownYear] = useState(initialYear);
	const [breakdownMonth, setBreakdownMonth] = useState(initialMonth);
	const [trendMonths, setTrendMonths] = useState(6);
	const [cashflowMonths, setCashflowMonths] = useState(12);

	const trendsQ = useQuery({
		queryKey: ["analytics", "trends", user?.id, trendMonths],
		queryFn: () => analyticsApi.fetchSpendingTrends(trendMonths),
		enabled: Boolean(user?.id),
	});

	const breakdownQ = useQuery({
		queryKey: [
			"analytics",
			"breakdown",
			user?.id,
			breakdownYear,
			breakdownMonth,
		],
		queryFn: () =>
			analyticsApi.fetchCategoryBreakdown(breakdownYear, breakdownMonth),
		enabled: Boolean(user?.id),
	});

	const cashflowQ = useQuery({
		queryKey: ["analytics", "cashflow", user?.id, cashflowMonths],
		queryFn: () => analyticsApi.fetchAnalyticsCashflow(cashflowMonths),
		enabled: Boolean(user?.id),
	});

	const networthQ = useQuery({
		queryKey: ["analytics", "networth", user?.id],
		queryFn: () => analyticsApi.fetchNetworthHistory(12),
		enabled: Boolean(user?.id),
	});

	// Pivot spending trends into monthly chart data: [{label, cat1, cat2, ...}]
	const trendsData = (() => {
		const rows = trendsQ.data?.trends ?? [];
		const monthMap = new Map<string, Record<string, string | number>>();
		for (const r of rows) {
			const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
			let entry = monthMap.get(key);
			if (!entry) {
				entry = { label: `${MONTH_NAMES[r.month]} ${r.year}` };
				monthMap.set(key, entry);
			}
			entry[r.categoryName ?? "Uncategorized"] = Number(r.total);
		}
		return Array.from(monthMap.values());
	})();

	const categoryNames = [
		...new Set(
			(trendsQ.data?.trends ?? []).map(
				(r) => r.categoryName ?? "Uncategorized",
			),
		),
	];

	const cashflow = cashflowQ.data?.cashflow ?? [];
	const cashflowChart = cashflow.map((r) => ({
		label: `${MONTH_NAMES[r.month]} ${r.year}`,
		income: Number(r.income),
		expense: Number(r.expense),
		net: Number(r.net),
		savingsRate: r.savingsRate,
	}));

	const networthHistory = (networthQ.data?.history ?? []).map((r) => ({
		date: r.date,
		netWorth: Number(r.netWorth),
	}));

	const breakdown = breakdownQ.data?.breakdown ?? [];
	const breakdownChartConfig = Object.fromEntries(
		breakdown.map((row, idx) => {
			const category = row.categoryName ?? "Uncategorized";
			return [
				category,
				{ label: category, color: CHART_COLORS[idx % CHART_COLORS.length] },
			];
		}),
	);
	const trendsChartConfig = Object.fromEntries(
		categoryNames.map((cat, idx) => [
			cat,
			{ label: cat, color: CHART_COLORS[idx % CHART_COLORS.length] },
		]),
	);

	const cashflowChartConfig = {
		income: { label: "Income", color: "#4ade80" },
		expense: { label: "Expense", color: "#f87171" },
		net: { label: "Net", color: "#60a5fa" },
	};
	const networthChartConfig = {
		netWorth: { label: "Net Worth", color: "#60a5fa" },
	};

	// Year options: current year and last 2
	const yearOptions = [initialYear, initialYear - 1, initialYear - 2];

	return (
		<div className="p-6 space-y-8">
			<h1 className="text-3xl font-semibold">Analytics</h1>

			{/* Category breakdown (pie chart) */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between flex-wrap gap-2">
						<CardTitle>Category Breakdown</CardTitle>
						<div className="flex gap-2">
							<Select
								value={String(breakdownYear)}
								onValueChange={(v) => setBreakdownYear(Number(v))}
							>
								<SelectTrigger className="w-24">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{yearOptions.map((y) => (
										<SelectItem key={y} value={String(y)}>
											{y}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={String(breakdownMonth)}
								onValueChange={(v) => setBreakdownMonth(Number(v))}
							>
								<SelectTrigger className="w-28">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MONTH_NAMES.slice(1).map((m, i) => (
										<SelectItem key={m} value={String(i + 1)}>
											{m}
										</SelectItem>
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
						<p className="text-muted-foreground">
							No expense data for this period.
						</p>
					) : (
						<div className="flex flex-col md:flex-row gap-6">
							<ChartContainer
								id="analytics-category-breakdown"
								config={breakdownChartConfig}
								className="h-60 w-full md:max-w-sm aspect-auto"
							>
								<PieChart>
									<Pie
										data={breakdown}
										dataKey="percent"
										nameKey="categoryName"
										outerRadius={90}
									>
										{breakdown.map((row, idx) => (
											<Cell
												key={`${row.categoryId ?? row.categoryName ?? "uncategorized"}-${String(row.total)}`}
												fill={CHART_COLORS[idx % CHART_COLORS.length]}
											/>
										))}
									</Pie>
									<ChartTooltip
										content={
											<ChartTooltipContent
												className="bg-muted text-foreground ring-border/60"
												formatter={(value, name, item) =>
													renderTooltipEntry(
														value,
														name,
														item.color ?? "hsl(var(--foreground))",
														(v) => `${Number(v)}%`,
													)
												}
											/>
										}
									/>
									<Legend />
								</PieChart>
							</ChartContainer>
							<div className="flex-1 space-y-2">
								{breakdown.map((r, idx) => (
									<div
										key={`${r.categoryId ?? r.categoryName ?? "uncategorized"}-${String(r.total)}`}
										className="flex items-center justify-between text-sm"
									>
										<div className="flex items-center gap-2">
											<span
												className="inline-block w-3 h-3 rounded-full"
												style={{
													background: CHART_COLORS[idx % CHART_COLORS.length],
												}}
											/>
											<span>{r.categoryName ?? "Uncategorized"}</span>
											{r.groupName && (
												<span className="text-muted-foreground text-xs">
													({r.groupName})
												</span>
											)}
										</div>
										<div className="flex gap-3">
											<span className="font-medium">
												{Number(r.total).toLocaleString(undefined, {
													minimumFractionDigits: 2,
												})}
											</span>
											<span className="text-muted-foreground">
												{r.percent}%
											</span>
										</div>
									</div>
								))}
								<div className="pt-2 border-t flex justify-between font-semibold text-sm">
									<span>Total</span>
									<span>
										{Number(breakdownQ.data?.grandTotal ?? 0).toLocaleString(
											undefined,
											{ minimumFractionDigits: 2 },
										)}
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
						<Select
							value={String(trendMonths)}
							onValueChange={(v) => setTrendMonths(Number(v))}
						>
							<SelectTrigger className="w-32">
								<SelectValue />
							</SelectTrigger>
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
						<ChartContainer
							id="analytics-spending-trends"
							config={trendsChartConfig}
							className="h-[280px] w-full aspect-auto"
						>
							<BarChart data={trendsData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="label" />
								<YAxis />
								<ChartTooltip
									content={
										<ChartTooltipContent
											className="bg-muted text-foreground ring-border/60"
											formatter={(value, name, item) =>
												renderTooltipEntry(
													value,
													name,
													item.color ?? "hsl(var(--foreground))",
												)
											}
										/>
									}
									cursor={BAR_CURSOR_STYLE}
								/>
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
						</ChartContainer>
					)}
				</CardContent>
			</Card>

			{/* Cashflow (income vs expense) */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Monthly Cashflow</CardTitle>
						<Select
							value={String(cashflowMonths)}
							onValueChange={(v) => setCashflowMonths(Number(v))}
						>
							<SelectTrigger className="w-32">
								<SelectValue />
							</SelectTrigger>
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
						<ChartContainer
							id="analytics-cashflow"
							config={cashflowChartConfig}
							className="h-[280px] w-full aspect-auto"
						>
							<BarChart data={cashflowChart}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="label" />
								<YAxis />
								<ChartTooltip
									content={
										<ChartTooltipContent
											className="bg-muted text-foreground ring-border/60"
											formatter={(value, name, item) =>
												renderTooltipEntry(
													value,
													name,
													item.color ?? "hsl(var(--foreground))",
												)
											}
										/>
									}
									cursor={BAR_CURSOR_STYLE}
								/>
								<Legend />
								<Bar dataKey="income" fill="#4ade80" name="Income" />
								<Bar dataKey="expense" fill="#f87171" name="Expense" />
								<Line
									type="monotone"
									dataKey="net"
									stroke="#60a5fa"
									name="Net"
									strokeWidth={2}
									dot={false}
								/>
							</BarChart>
						</ChartContainer>
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
						<p className="text-muted-foreground">
							No balance history yet. Update account balances to track net worth
							over time.
						</p>
					) : (
						<ChartContainer
							id="analytics-net-worth"
							config={networthChartConfig}
							className="h-60 w-full aspect-auto"
						>
							<LineChart data={networthHistory}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis
									dataKey="date"
									tickFormatter={(d) =>
										new Date(d).toLocaleDateString(undefined, {
											month: "short",
											day: "numeric",
										})
									}
								/>
								<YAxis />
								<ChartTooltip
									content={
										<ChartTooltipContent
											className="bg-muted text-foreground ring-border/60"
											formatter={(value, name, item) =>
												renderTooltipEntry(
													value,
													name,
													item.color ?? "hsl(var(--foreground))",
													(v) =>
														Number(v).toLocaleString(undefined, {
															minimumFractionDigits: 2,
														}),
												)
											}
										/>
									}
								/>
								<Line
									type="monotone"
									dataKey="netWorth"
									stroke="#60a5fa"
									strokeWidth={2}
									dot={false}
									name="Net Worth"
								/>
							</LineChart>
						</ChartContainer>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
