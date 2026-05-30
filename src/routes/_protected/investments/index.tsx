import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart } from "recharts";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "#/components/ui/chart";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { createAccountsDataAccess } from "#/features/accounts/data-access";
import { createCategoriesDataAccess } from "#/features/categories/data-access";
import {
	createInvestmentsDataAccess,
	type InvestmentEntry,
	type InvestmentValuation,
} from "#/features/investments/data-access";
import useCurrentUser from "#/hooks/use-current-user";
import { toLocalDateInputValue } from "#/lib/date.ts";
import {
	calculateGainLoss,
	calculatePortfolioAllocation,
} from "#/lib/investment-analytics";

export const Route = createFileRoute("/_protected/investments/")({
	component: InvestmentsPage,
});

const CHART_COLORS = [
	"#4ade80",
	"#60a5fa",
	"#facc15",
	"#f87171",
	"#a78bfa",
	"#fb923c",
];

const INVESTMENT_TYPE_LABEL: Record<string, string> = {
	mutual_fund: "Mutual Fund",
	stock: "Stock",
	etf: "ETF",
	crypto: "Crypto",
	bond: "Bond",
	fd: "Fixed Deposit",
	ppf: "PPF",
	other: "Other",
};

function fmt(val: string | number) {
	return Number(val).toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function DatePicker({
	id,
	value,
	onChange,
	placeholder = "Select date",
}: {
	id?: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
}) {
	return (
		<Popover>
			<PopoverTrigger
				nativeButton={false}
				render={
					<Input
						id={id}
						readOnly
						value={value}
						placeholder={placeholder}
						className="cursor-pointer"
					/>
				}
			/>
			<PopoverContent sideOffset={4} align="start">
				<Calendar
					mode="single"
					selected={value ? new Date(`${value}T00:00:00`) : undefined}
					onSelect={(date) => date && onChange(toLocalDateInputValue(date))}
					showOutsideDays={false}
				/>
			</PopoverContent>
		</Popover>
	);
}

function InvestmentsPage() {
	const user = useCurrentUser();
	const qc = useQueryClient();
	const investmentsApi = useMemo(
		() => createInvestmentsDataAccess(user),
		[user],
	);
	const accountsApi = useMemo(() => createAccountsDataAccess(user), [user]);
	const categoriesApi = useMemo(() => createCategoriesDataAccess(user), [user]);

	const invQ = useQuery({
		queryKey: ["investments", user?.id],
		queryFn: () => investmentsApi.fetchInvestments(),
		enabled: Boolean(user?.id),
	});
	const entryQ = useQuery({
		queryKey: ["investmentEntries", user?.id],
		queryFn: () => investmentsApi.fetchInvestmentEntries(),
		enabled: Boolean(user?.id),
	});
	const valQ = useQuery({
		queryKey: ["investmentValuations", user?.id],
		queryFn: () => investmentsApi.fetchInvestmentValuations(),
		enabled: Boolean(user?.id),
	});

	const investments = invQ.data?.investments ?? [];
	const entries = entryQ.data?.entries ?? [];
	const valuations = valQ.data?.valuations ?? [];

	// Add investment form
	const [newName, setNewName] = useState("");
	const [newType, setNewType] = useState("");
	const [newSymbol, setNewSymbol] = useState("");

	// Add entry form
	const [entryInvestmentId, setEntryInvestmentId] = useState("");
	const [entryAccountId, setEntryAccountId] = useState("");
	const [entryCategoryId, setEntryCategoryId] = useState("");
	const [entryAmount, setEntryAmount] = useState("");
	const [entryUnits, setEntryUnits] = useState("");
	const [entryDate, setEntryDate] = useState("");
	const [entryNotes, setEntryNotes] = useState("");

	const accountsQ = useQuery({
		queryKey: ["accounts", user?.id],
		queryFn: () => accountsApi.fetchAccounts(),
		enabled: Boolean(user?.id),
	});
	const categoriesQ = useQuery({
		queryKey: ["categories", user?.id],
		queryFn: () => categoriesApi.fetchCategories(),
		enabled: Boolean(user?.id),
	});
	const accountsList = accountsQ.data?.accounts ?? [];
	const cashAccountsList = accountsList.filter((a) =>
		["bank", "cash", "wallet", "salary"].includes(a.accountType),
	);
	const categoriesList = categoriesQ.data?.categories ?? [];
	const accountNameMap = useMemo(
		() => new Map<string, string>(accountsList.map((a) => [a.id, a.name])),
		[accountsList],
	);
	const categoryNameMap = useMemo(
		() => new Map<string, string>(categoriesList.map((c) => [c.id, c.name])),
		[categoriesList],
	);

	// Add valuation form
	const [valInvestmentId, setValInvestmentId] = useState("");
	const [valAmount, setValAmount] = useState("");
	const [valDate, setValDate] = useState("");

	const invalidateAll = () => {
		qc.invalidateQueries({ queryKey: ["investments", user?.id] });
		qc.invalidateQueries({ queryKey: ["investmentEntries", user?.id] });
		qc.invalidateQueries({ queryKey: ["investmentValuations", user?.id] });
		qc.invalidateQueries({ queryKey: ["accounts", user?.id] });
	};

	const refreshPortfolioQueries = () => {
		invalidateAll();
		qc.refetchQueries({ queryKey: ["investments", user?.id], type: "active" });
		qc.refetchQueries({
			queryKey: ["investmentEntries", user?.id],
			type: "active",
		});
		qc.refetchQueries({
			queryKey: ["investmentValuations", user?.id],
			type: "active",
		});
		qc.refetchQueries({ queryKey: ["accounts", user?.id], type: "active" });
	};

	const createInvM = useMutation({
		mutationFn: () =>
			investmentsApi.createInvestment({
				name: newName,
				investmentType: newType,
				symbol: newSymbol || null,
			}),
		onSuccess: () => {
			refreshPortfolioQueries();
			setNewName("");
			setNewType("");
			setNewSymbol("");
		},
	});

	const createEntryM = useMutation({
		mutationFn: () =>
			investmentsApi.createInvestmentEntry({
				investmentId: entryInvestmentId,
				accountId: entryAccountId,
				categoryId: entryCategoryId || null,
				amountInvested: Number(entryAmount),
				units: entryUnits ? Number(entryUnits) : undefined,
				investedAt: entryDate ? new Date(entryDate) : undefined,
				notes: entryNotes,
			}),
		onSuccess: () => {
			refreshPortfolioQueries();
			setEntryAmount("");
			setEntryUnits("");
			setEntryDate("");
			setEntryNotes("");
			setEntryCategoryId("");
		},
	});

	const createValM = useMutation({
		mutationFn: () =>
			investmentsApi.createInvestmentValuation({
				investmentId: valInvestmentId,
				valuationAmount: Number(valAmount),
				valuationDate: valDate ? new Date(valDate) : undefined,
			}),
		onSuccess: () => {
			refreshPortfolioQueries();
			setValAmount("");
			setValDate("");
		},
	});

	const deleteInvM = useMutation({
		mutationFn: (id: string) => investmentsApi.deleteInvestmentById(id),
		onSuccess: refreshPortfolioQueries,
	});

	const liquidateM = useMutation({
		mutationFn: (id: string) => investmentsApi.liquidateInvestment(id),
		onSuccess: refreshPortfolioQueries,
	});

	const deleteEntryM = useMutation({
		mutationFn: (id: string) => investmentsApi.deleteInvestmentEntry(id),
		onSuccess: refreshPortfolioQueries,
	});

	const deleteValM = useMutation({
		mutationFn: (id: string) => investmentsApi.deleteInvestmentValuation(id),
		onSuccess: refreshPortfolioQueries,
	});

	const investmentNameMap = useMemo(
		() => new Map<string, string>(investments.map((inv) => [inv.id, inv.name])),
		[investments],
	);

	const gainLoss = calculateGainLoss(entries, valuations);
	const allocationWithNames = useMemo(() => {
		return calculatePortfolioAllocation(valuations).map((a) => ({
			...a,
			investmentName: investmentNameMap.get(a.investmentId) ?? a.investmentId,
		}));
	}, [investmentNameMap, valuations]);

	const allocationChartConfig = Object.fromEntries(
		allocationWithNames.map((allocation, idx) => [
			allocation.investmentName,
			{
				label: allocation.investmentName,
				color: CHART_COLORS[idx % CHART_COLORS.length],
			},
		]),
	);

	// Group entries and valuations by investmentId
	const entriesByInv = useMemo(() => {
		const m = new Map<string, InvestmentEntry[]>();
		for (const e of entries) {
			const arr = m.get(e.investmentId) ?? [];
			arr.push(e);
			m.set(e.investmentId, arr);
		}
		return m;
	}, [entries]);

	const valuationsByInv = useMemo(() => {
		const m = new Map<string, InvestmentValuation[]>();
		for (const v of valuations) {
			const arr = m.get(v.investmentId) ?? [];
			arr.push(v);
			m.set(v.investmentId, arr);
		}
		return m;
	}, [valuations]);

	const totalInvested = entries.reduce(
		(s: number, e) => s + Number(e.amountInvested),
		0,
	);
	const currentValue = valuations.reduce(
		(s: number, v) => s + Number(v.valuationAmount),
		0,
	);
	const totalGain = currentValue - totalInvested;

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-semibold">Investments</h1>

			{/* Summary row */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Total Invested</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						{fmt(totalInvested)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Current Value</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						{fmt(currentValue)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Total Gain / Loss</CardTitle>
					</CardHeader>
					<CardContent
						className={`text-2xl font-semibold ${totalGain >= 0 ? "text-green-600" : "text-red-600"}`}
					>
						{totalGain >= 0 ? "+" : ""}
						{fmt(totalGain)}
					</CardContent>
				</Card>
			</div>

			<Tabs defaultValue="overview">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="manage">Manage Records</TabsTrigger>
					<TabsTrigger value="add">Add New</TabsTrigger>
				</TabsList>

				{/* Overview tab — charts */}
				<TabsContent value="overview" className="space-y-4">
					<div className="grid gap-6 md:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Portfolio Allocation</CardTitle>
							</CardHeader>
							<CardContent>
								{allocationWithNames.length === 0 ? (
									<p className="text-muted-foreground">No valuations yet.</p>
								) : (
									<ChartContainer
										id="investments-allocation"
										config={allocationChartConfig}
										className="h-55 w-full aspect-auto"
									>
										<PieChart>
											<ChartTooltip
												content={
													<ChartTooltipContent
														className="bg-muted text-foreground ring-border/60"
														formatter={(value, name, item) => {
															const numericValue = Number(value ?? 0);
															const percentValue =
																numericValue <= 1
																	? numericValue * 100
																	: numericValue;
															const color =
																item.color ?? "hsl(var(--foreground))";

															return (
																<div className="flex w-full items-center justify-between gap-3">
																	<span
																		className="font-medium"
																		style={{ color }}
																	>
																		{String(name ?? "Allocation")}
																	</span>
																	<span
																		className="font-mono font-semibold tabular-nums"
																		style={{ color }}
																	>
																		{percentValue.toFixed(2)}%
																	</span>
																</div>
															);
														}}
													/>
												}
											/>
											<Legend />
											<Pie
												data={allocationWithNames}
												dataKey="allocationPercent"
												nameKey="investmentName"
												outerRadius={80}
												label={({ name, percent = 0 }) =>
													`${name}: ${(percent * 100).toFixed(0)}%`
												}
												labelLine={false}
											>
												{allocationWithNames.map((allocation, idx) => (
													<Cell
														key={allocation.investmentId}
														fill={CHART_COLORS[idx % CHART_COLORS.length]}
													/>
												))}
											</Pie>
										</PieChart>
									</ChartContainer>
								)}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Gain / Loss by Investment</CardTitle>
							</CardHeader>
							<CardContent>
								{gainLoss.length === 0 ? (
									<p className="text-muted-foreground">No data yet.</p>
								) : (
									<ul className="space-y-2">
										{gainLoss.map(({ investmentId, gainLoss: gl }) => {
											const name =
												investmentNameMap.get(investmentId) ?? investmentId;
											return (
												<li
													key={investmentId}
													className="flex justify-between text-sm"
												>
													<span>{name}</span>
													<span
														className={
															gl >= 0
																? "text-green-600 font-medium"
																: "text-red-600 font-medium"
														}
													>
														{gl >= 0 ? "+" : ""}
														{fmt(gl)}
													</span>
												</li>
											);
										})}
									</ul>
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				{/* Manage tab — investments + entries/valuations */}
				<TabsContent value="manage" className="space-y-4">
					{investments.length === 0 ? (
						<p className="text-muted-foreground">
							No investments yet. Add one in the "Add New" tab.
						</p>
					) : (
						investments.map((inv) => {
							const invEntries = entriesByInv.get(inv.id) ?? [];
							const invVals = valuationsByInv.get(inv.id) ?? [];
							const invested = invEntries.reduce(
								(s: number, e) => s + Number(e.amountInvested),
								0,
							);
							const latestVal = invVals[0]
								? Number(invVals[0].valuationAmount)
								: null;
							const gl = latestVal !== null ? latestVal - invested : null;

							return (
								<Card key={inv.id}>
									<CardContent className="pt-4 space-y-4">
										{/* Investment header */}
										<div className="flex items-center justify-between flex-wrap gap-2">
											<div className="flex items-center gap-2">
												<span className="font-semibold text-lg">
													{inv.name}
												</span>
												<Badge variant="outline" className="text-xs">
													{inv.investmentType}
												</Badge>
												{inv.symbol && (
													<Badge
														variant="outline"
														className="text-xs font-mono"
													>
														{inv.symbol}
													</Badge>
												)}
												{inv.status === "liquidated" && (
													<Badge className="text-xs bg-gray-100 text-gray-600">
														Liquidated
													</Badge>
												)}
											</div>
											<div className="flex gap-2">
												{inv.status === "active" && (
													<Button
														size="sm"
														variant="outline"
														onClick={() => liquidateM.mutate(inv.id)}
														disabled={liquidateM.isPending}
													>
														Mark Liquidated
													</Button>
												)}
												<Button
													size="sm"
													variant="ghost"
													className="text-destructive"
													onClick={() => deleteInvM.mutate(inv.id)}
												>
													Delete
												</Button>
											</div>
										</div>

										{/* Stats row */}
										<div className="flex gap-6 text-sm text-muted-foreground">
											<span>
												Invested:{" "}
												<span className="text-foreground font-medium">
													{fmt(invested)}
												</span>
											</span>
											{latestVal !== null && (
												<span>
													Current:{" "}
													<span className="text-foreground font-medium">
														{fmt(latestVal)}
													</span>
												</span>
											)}
											{gl !== null && (
												<span>
													G/L:{" "}
													<span
														className={`font-medium ${gl >= 0 ? "text-green-600" : "text-red-600"}`}
													>
														{gl >= 0 ? "+" : ""}
														{fmt(gl)}
													</span>
												</span>
											)}
										</div>

										{/* Entries */}
										{invEntries.length > 0 && (
											<div>
												<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
													SIP Entries ({invEntries.length})
												</p>
												<div className="space-y-1">
													{invEntries.map((e) => (
														<div
															key={e.id}
															className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-1.5"
														>
															<span>
																{new Date(e.investedAt).toLocaleDateString()}
															</span>
															<span className="font-medium">
																{fmt(e.amountInvested)}
															</span>
															{e.units && (
																<span className="text-muted-foreground">
																	{Number(e.units).toFixed(4)} units
																</span>
															)}
															{e.notes && (
																<span className="text-muted-foreground text-xs truncate max-w-32">
																	{e.notes}
																</span>
															)}
															<Button
																size="sm"
																variant="ghost"
																className="text-destructive h-6 px-2 text-xs"
																onClick={() => deleteEntryM.mutate(e.id)}
															>
																Delete
															</Button>
														</div>
													))}
												</div>
											</div>
										)}

										{/* Valuations */}
										{invVals.length > 0 && (
											<div>
												<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
													Valuations ({invVals.length})
												</p>
												<div className="space-y-1">
													{invVals.map((v) => (
														<div
															key={v.id}
															className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-1.5"
														>
															<span>
																{new Date(v.valuationDate).toLocaleDateString()}
															</span>
															<span className="font-medium">
																{fmt(v.valuationAmount)}
															</span>
															<Button
																size="sm"
																variant="ghost"
																className="text-destructive h-6 px-2 text-xs"
																onClick={() => deleteValM.mutate(v.id)}
															>
																Delete
															</Button>
														</div>
													))}
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							);
						})
					)}
				</TabsContent>

				{/* Add New tab */}
				<TabsContent value="add" className="space-y-6">
					{/* Add Investment */}
					<Card>
						<CardHeader>
							<CardTitle>Add Investment</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label htmlFor="new-name">Name</Label>
									<Input
										id="new-name"
										value={newName}
										onChange={(e) => setNewName(e.target.value)}
										placeholder="Nifty 50 Index Fund"
									/>
								</div>
								<div>
									<Label htmlFor="new-symbol">Ticker Symbol (optional)</Label>
									<Input
										id="new-symbol"
										value={newSymbol}
										onChange={(e) => setNewSymbol(e.target.value)}
										placeholder="e.g. NIFTYBEES"
									/>
								</div>
							</div>
							<div>
								<Label htmlFor="new-type">Type</Label>
								<Select
									value={newType}
									onValueChange={(v) => setNewType(v ?? "")}
								>
									<SelectTrigger id="new-type">
										{newType ? (
											<span
												data-slot="select-value"
												className="flex flex-1 text-left text-sm"
											>
												{INVESTMENT_TYPE_LABEL[newType] ?? newType}
											</span>
										) : (
											<SelectValue placeholder="Select type" />
										)}
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="mutual_fund">Mutual Fund</SelectItem>
										<SelectItem value="stock">Stock</SelectItem>
										<SelectItem value="etf">ETF</SelectItem>
										<SelectItem value="crypto">Crypto</SelectItem>
										<SelectItem value="bond">Bond</SelectItem>
										<SelectItem value="fd">Fixed Deposit</SelectItem>
										<SelectItem value="ppf">PPF</SelectItem>
										<SelectItem value="other">Other</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<Button
								onClick={() => createInvM.mutate()}
								disabled={!newName || !newType || createInvM.isPending}
							>
								{createInvM.isPending ? "Adding…" : "Add Investment"}
							</Button>
						</CardContent>
					</Card>

					{/* Add SIP Entry */}
					<Card>
						<CardHeader>
							<CardTitle>Add SIP / Entry</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<Label htmlFor="entry-inv">Investment</Label>
								<Select
									value={entryInvestmentId}
									onValueChange={(v) => setEntryInvestmentId(v ?? "")}
								>
									<SelectTrigger id="entry-inv">
										{entryInvestmentId ? (
											<span
												data-slot="select-value"
												className="flex flex-1 text-left text-sm"
											>
												{investmentNameMap.get(entryInvestmentId) ??
													entryInvestmentId}
											</span>
										) : (
											<SelectValue placeholder="Select investment" />
										)}
									</SelectTrigger>
									<SelectContent>
										{investments.map((inv) => (
											<SelectItem key={inv.id} value={inv.id}>
												{inv.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label htmlFor="entry-account">From account</Label>
									<Select
										value={entryAccountId}
										onValueChange={(v) => setEntryAccountId(v ?? "")}
									>
										<SelectTrigger id="entry-account">
											{entryAccountId ? (
												<span
													data-slot="select-value"
													className="flex flex-1 text-left text-sm"
												>
													{accountNameMap.get(entryAccountId) ?? entryAccountId}
												</span>
											) : (
												<SelectValue placeholder="Select bank account" />
											)}
										</SelectTrigger>
										<SelectContent>
											{cashAccountsList.map((a) => (
												<SelectItem key={a.id} value={a.id}>
													{a.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground mt-1">
										Money moves from here into the investment account.
									</p>
								</div>
								<div>
									<Label htmlFor="entry-category">Category (optional)</Label>
									<Select
										value={entryCategoryId}
										onValueChange={(v) => setEntryCategoryId(v ?? "")}
									>
										<SelectTrigger id="entry-category">
											{entryCategoryId ? (
												<span
													data-slot="select-value"
													className="flex flex-1 text-left text-sm"
												>
													{categoryNameMap.get(entryCategoryId) ??
														entryCategoryId}
												</span>
											) : (
												<SelectValue placeholder="No category" />
											)}
										</SelectTrigger>
										<SelectContent>
											{categoriesList.map((c) => (
												<SelectItem key={c.id} value={c.id}>
													{c.name}
													{c.groupName ? ` — ${c.groupName}` : ""}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label htmlFor="entry-amount">Amount Invested</Label>
									<Input
										id="entry-amount"
										type="number"
										step="0.01"
										value={entryAmount}
										onChange={(e) => setEntryAmount(e.target.value)}
									/>
								</div>
								<div>
									<Label htmlFor="entry-units">Units (optional)</Label>
									<Input
										id="entry-units"
										type="number"
										step="0.0001"
										value={entryUnits}
										onChange={(e) => setEntryUnits(e.target.value)}
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label>Date</Label>
									<DatePicker
										value={entryDate}
										onChange={setEntryDate}
										placeholder="Select date"
									/>
								</div>
								<div>
									<Label htmlFor="entry-notes">Notes</Label>
									<Input
										id="entry-notes"
										value={entryNotes}
										onChange={(e) => setEntryNotes(e.target.value)}
									/>
								</div>
							</div>
							<Button
								onClick={() => createEntryM.mutate()}
								disabled={
									!entryInvestmentId ||
									!entryAccountId ||
									!entryAmount ||
									createEntryM.isPending
								}
							>
								{createEntryM.isPending ? "Adding…" : "Add Entry"}
							</Button>
						</CardContent>
					</Card>

					{/* Add Valuation */}
					<Card>
						<CardHeader>
							<CardTitle>Add Valuation</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<Label htmlFor="val-inv">Investment</Label>
								<Select
									value={valInvestmentId}
									onValueChange={(v) => setValInvestmentId(v ?? "")}
								>
									<SelectTrigger id="val-inv">
										{valInvestmentId ? (
											<span
												data-slot="select-value"
												className="flex flex-1 text-left text-sm"
											>
												{investmentNameMap.get(valInvestmentId) ??
													valInvestmentId}
											</span>
										) : (
											<SelectValue placeholder="Select investment" />
										)}
									</SelectTrigger>
									<SelectContent>
										{investments.map((inv) => (
											<SelectItem key={inv.id} value={inv.id}>
												{inv.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label htmlFor="val-amount">Current Value</Label>
									<Input
										id="val-amount"
										type="number"
										step="0.01"
										value={valAmount}
										onChange={(e) => setValAmount(e.target.value)}
									/>
								</div>
								<div>
									<Label>Valuation Date</Label>
									<DatePicker
										value={valDate}
										onChange={setValDate}
										placeholder="Select date"
									/>
								</div>
							</div>
							<Button
								onClick={() => createValM.mutate()}
								disabled={
									!valInvestmentId || !valAmount || createValM.isPending
								}
							>
								{createValM.isPending ? "Saving…" : "Add Valuation"}
							</Button>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
