import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Briefcase,
	Calendar as CalendarIcon,
	Car,
	Circle,
	Fuel,
	GraduationCap,
	Heart,
	Home,
	Landmark,
	ListChecks,
	type LucideIcon,
	Receipt,
	ShoppingCart,
	Sparkles,
	Tag,
	TrendingUp,
	Tv,
	Utensils,
	Wallet,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	type BudgetPreset,
	createBudgetsDataAccess,
	type MonthlyBudget,
	type MonthlyBudgetAllocation,
} from "#/features/budgets/data-access";
import { createCategoriesDataAccess } from "#/features/categories/data-access";
import useCurrentUser from "#/hooks/use-current-user";

type AllocationRow = {
	id: string;
	groupId?: string;
	amount: string;
};

const INITIAL_ALLOCATION_ROW: AllocationRow = {
	id: "alloc-initial",
	amount: "",
};

const createRow = (): AllocationRow => ({
	id:
		typeof globalThis.crypto !== "undefined" &&
		"randomUUID" in globalThis.crypto
			? globalThis.crypto.randomUUID()
			: `alloc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
	amount: "",
});

const ICON_COMPONENTS: Record<string, LucideIcon> = {
	folder: Circle,
	home: Home,
	receipt: Receipt,
	car: Car,
	heart: Heart,
	briefcase: Briefcase,
	sparkles: Sparkles,
	landmark: Landmark,
	tag: Tag,
	"shopping-cart": ShoppingCart,
	utensils: Utensils,
	fuel: Fuel,
	tv: Tv,
	"graduation-cap": GraduationCap,
	wallet: Wallet,
	"trending-up": TrendingUp,
};

const MONTH_OPTIONS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

function IconGlyph({ iconName }: { iconName: string }) {
	const Icon = ICON_COMPONENTS[iconName] ?? Circle;
	return <Icon className="size-4" />;
}

export const Route = createFileRoute("/_protected/budgets/")({
	loader: () => {
		const now = new Date();
		return {
			initialYear: now.getFullYear(),
			initialMonth: now.getMonth(),
		};
	},
	component: BudgetsPage,
});

function BudgetsPage() {
	const { initialYear, initialMonth } = Route.useLoaderData();
	const currentUser = useCurrentUser();
	const queryClient = useQueryClient();
	const categoriesApi = useMemo(
		() => createCategoriesDataAccess(currentUser),
		[currentUser],
	);
	const budgetsApi = useMemo(
		() => createBudgetsDataAccess(currentUser),
		[currentUser],
	);

	// Preset form
	const [presetName, setPresetName] = useState("");
	const [presetDesc, setPresetDesc] = useState("");
	const [rows, setRows] = useState<AllocationRow[]>([INITIAL_ALLOCATION_ROW]);
	const [presetError, setPresetError] = useState<string | null>(null);
	const [showCreatePreset, setShowCreatePreset] = useState(false);

	// Monthly budget
	const [selectedYear, setSelectedYear] = useState(initialYear);
	const [selectedMonth, setSelectedMonth] = useState(initialMonth);
	const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
	const [selectedPreset, setSelectedPreset] = useState<string>("");
	const [expectedIncome, setExpectedIncome] = useState("0");
	const [editingIncome, setEditingIncome] = useState(false);
	const [incomeInput, setIncomeInput] = useState("0");
	const yearOptions = useMemo(() => {
		const currentYear = new Date().getFullYear();
		const years = new Set<number>([selectedYear, currentYear]);

		for (let offset = -5; offset <= 5; offset += 1) {
			years.add(currentYear + offset);
		}

		return [...years].sort((a, b) => a - b);
	}, [selectedYear]);

	// Per-allocation edit state: id → draft amount string
	const [editingAlloc, setEditingAlloc] = useState<Record<string, string>>({});

	const groupsQuery = useQuery({
		queryKey: ["category-groups", currentUser?.id],
		queryFn: () => categoriesApi.fetchCategoryGroups(),
		enabled: Boolean(currentUser?.id),
	});
	const presetsQuery = useQuery({
		queryKey: ["budget-presets", currentUser?.id],
		queryFn: () => budgetsApi.fetchBudgetPresets(),
		enabled: Boolean(currentUser?.id),
	});
	const monthlyQuery = useQuery({
		queryKey: ["monthly-budget", currentUser?.id, monthKey],
		queryFn: () => budgetsApi.fetchMonthlyBudget(monthKey),
		enabled: Boolean(currentUser?.id),
		retry: false,
	});

	const createMutation = useMutation({
		mutationFn: (input: {
			name: string;
			description?: string;
			allocations: Array<{
				categoryGroupId?: string | null;
				categoryId?: string | null;
				allocatedAmount: number;
				allocationPercent?: number | null;
			}>;
		}) => budgetsApi.createBudgetPreset(input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["budget-presets"],
			});
			setPresetName("");
			setPresetDesc("");
			setRows([createRow()]);
			setPresetError(null);
			setShowCreatePreset(false);
		},
	});

	const deletePresetM = useMutation({
		mutationFn: (id: string) => budgetsApi.deleteBudgetPreset(id),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ["budget-presets", currentUser?.id],
			}),
	});

	const applyMutation = useMutation({
		mutationFn: (input: {
			presetId: string;
			year: number;
			month: number;
			expectedIncome?: number;
		}) => budgetsApi.applyPresetToMonth(input),
		onSuccess: async (_, input) => {
			const appliedMonthKey = `${input.year}-${String(input.month).padStart(2, "0")}`;
			await queryClient.invalidateQueries({
				queryKey: ["monthly-budget", currentUser?.id, appliedMonthKey],
			});
		},
	});

	const updateIncomeMutation = useMutation({
		mutationFn: (income: number) =>
			budgetsApi.updateMonthlyBudget(monthKey, { expectedIncome: income }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["monthly-budget", currentUser?.id, monthKey],
			});
			setEditingIncome(false);
		},
	});

	const deleteMonthlyM = useMutation({
		mutationFn: () => budgetsApi.deleteMonthlyBudget(monthKey),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ["monthly-budget", currentUser?.id, monthKey],
			}),
	});

	const updateAllocM = useMutation({
		mutationFn: ({ id, amount }: { id: string; amount: number }) =>
			budgetsApi.updateMonthlyAllocation(id, { allocatedAmount: amount }),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({
				queryKey: ["monthly-budget", currentUser?.id, monthKey],
			});
			setEditingAlloc((prev) => {
				const next = { ...prev };
				delete next[id];
				return next;
			});
		},
	});

	const deleteAllocM = useMutation({
		mutationFn: (id: string) => budgetsApi.deleteMonthlyAllocation(id),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ["monthly-budget", currentUser?.id, monthKey],
			}),
	});

	useEffect(() => {
		const list = presetsQuery.data?.presets as BudgetPreset[] | undefined;
		if (!selectedPreset && list?.length) {
			setSelectedPreset(list[0].id);
		}
	}, [presetsQuery.data, selectedPreset]);

	const groups = groupsQuery.data?.categoryGroups ?? [];
	const presets = (presetsQuery.data?.presets as BudgetPreset[]) || [];
	const monthly = monthlyQuery.data?.monthlyBudget as MonthlyBudget | undefined;
	const allocations = monthlyQuery.data?.allocations as
		| MonthlyBudgetAllocation[]
		| undefined;

	function updateRow(id: string, data: Partial<AllocationRow>) {
		setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
	}
	function removeRow(id: string) {
		setRows((prev) =>
			prev.length > 1 ? prev.filter((r) => r.id !== id) : prev,
		);
	}
	function addRow() {
		setRows((prev) => [...prev, createRow()]);
	}

	const totalAllocated = useMemo(
		() =>
			allocations?.reduce((sum, a) => sum + Number(a.allocatedAmount), 0) ?? 0,
		[allocations],
	);

	const handleCreatePreset = (e: FormEvent) => {
		e.preventDefault();
		const allocs = rows
			.filter((r) => Number(r.amount) > 0)
			.map((r) => ({
				categoryGroupId: r.groupId ?? null,
				categoryId: null,
				allocatedAmount: Number(r.amount),
			}));
		if (!presetName.trim() || !allocs.length) {
			setPresetError("Name and at least one allocation required");
			return;
		}
		createMutation.mutate({
			name: presetName,
			description: presetDesc,
			allocations: allocs,
		});
	};

	const handleApply = () => {
		if (!selectedPreset) return;
		applyMutation.mutate({
			presetId: selectedPreset,
			year: selectedYear,
			month: selectedMonth + 1,
			expectedIncome: Number(expectedIncome),
		});
	};

	return (
		<div className="p-6 space-y-6">
			{/* ── Budget Presets ───────────────────────────────── */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>
							<CalendarIcon className="size-4 inline-block mr-2" />
							Budget Presets
						</CardTitle>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowCreatePreset((v) => !v)}
						>
							{showCreatePreset ? "Cancel" : "+ New Preset"}
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Existing presets list */}
					{presets.length === 0 ? (
						<p className="text-sm text-muted-foreground">No presets yet.</p>
					) : (
						<div className="space-y-2">
							{presets.map((p) => {
								const total = p.allocations.reduce(
									(s, a) => s + Number(a.allocatedAmount),
									0,
								);
								return (
									<div
										key={p.id}
										className="flex items-center justify-between rounded-md border px-3 py-2"
									>
										<div>
											<span className="font-medium text-sm">{p.name}</span>
											{p.description && (
												<span className="ml-2 text-xs text-muted-foreground">
													{p.description}
												</span>
											)}
											<span className="ml-2 text-xs text-muted-foreground">
												{p.allocations.length} allocation
												{p.allocations.length !== 1 ? "s" : ""} ·{" "}
												{total.toFixed(2)}
											</span>
										</div>
										<Button
											variant="ghost"
											size="sm"
											className="text-destructive"
											onClick={() => deletePresetM.mutate(p.id)}
											disabled={deletePresetM.isPending}
										>
											Delete
										</Button>
									</div>
								);
							})}
						</div>
					)}

					{/* Create preset form */}
					{showCreatePreset && (
						<form
							onSubmit={handleCreatePreset}
							className="space-y-4 pt-2 border-t"
						>
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="preset-name">Name</Label>
									<Input
										id="preset-name"
										value={presetName}
										onChange={(e) => setPresetName(e.target.value)}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="preset-desc">Description</Label>
									<Input
										id="preset-desc"
										value={presetDesc}
										onChange={(e) => setPresetDesc(e.target.value)}
									/>
								</div>
							</div>
							<div className="space-y-3">
								{rows.map((row) => (
									<div
										key={row.id}
										className="grid gap-2 sm:grid-cols-[1fr_auto_auto] items-end"
									>
										<Select
											value={row.groupId || ""}
											onValueChange={(v) =>
												updateRow(row.id, { groupId: v ?? "" })
											}
										>
											<SelectTrigger>
												{(() => {
													const g = row.groupId
														? groups.find((gg) => gg.id === row.groupId)
														: null;
													return g ? (
														<span
															data-slot="select-value"
															className="flex flex-1 items-center gap-1.5 text-left text-sm"
														>
															<IconGlyph iconName={g.icon} />
															{g.name}
														</span>
													) : (
														<SelectValue placeholder="Select group" />
													);
												})()}
											</SelectTrigger>
											<SelectContent>
												{groups.map((g) => (
													<SelectItem key={g.id} value={g.id}>
														<IconGlyph iconName={g.icon} />
														{g.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<Input
											type="number"
											step="0.01"
											placeholder="Amount"
											value={row.amount}
											onChange={(e) =>
												updateRow(row.id, { amount: e.target.value })
											}
										/>
										<Button
											type="button"
											variant="destructive"
											onClick={() => removeRow(row.id)}
										>
											×
										</Button>
									</div>
								))}
							</div>
							{presetError && (
								<p className="text-sm text-destructive">{presetError}</p>
							)}
							<div className="flex gap-2">
								<Button variant="outline" type="button" onClick={addRow}>
									Add Allocation
								</Button>
								<Button type="submit" disabled={createMutation.isPending}>
									Save Preset
								</Button>
							</div>
						</form>
					)}
				</CardContent>
			</Card>

			{/* ── Monthly Budget ───────────────────────────────── */}
			<Card>
				<CardHeader>
					<CardTitle>
						<ListChecks className="size-4 inline-block mr-2" />
						Monthly Budget
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Month picker */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label>Month</Label>
							<Select
								value={String(selectedMonth)}
								onValueChange={(value) => setSelectedMonth(Number(value))}
							>
								<SelectTrigger>
									{MONTH_OPTIONS[selectedMonth] ? (
										<span
											data-slot="select-value"
											className="flex flex-1 text-left text-sm"
										>
											{MONTH_OPTIONS[selectedMonth]}
										</span>
									) : (
										<SelectValue placeholder="Select month" />
									)}
								</SelectTrigger>
								<SelectContent>
									{MONTH_OPTIONS.map((month, index) => (
										<SelectItem key={month} value={String(index)}>
											{month}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Year</Label>
							<Select
								value={String(selectedYear)}
								onValueChange={(value) => setSelectedYear(Number(value))}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select year" />
								</SelectTrigger>
								<SelectContent>
									{yearOptions.map((year) => (
										<SelectItem key={year} value={String(year)}>
											{year}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* No budget for this month */}
					{!monthly && !monthlyQuery.isLoading && (
						<div className="space-y-3 pt-2 border-t">
							<p className="text-sm text-muted-foreground">
								No budget for {monthKey}. Apply a preset to create one.
							</p>
							<div className="grid gap-4 sm:grid-cols-3">
								<div className="space-y-2">
									<Label>Preset</Label>
									<Select
										value={selectedPreset}
										onValueChange={(v) => setSelectedPreset(v ?? "")}
									>
										<SelectTrigger>
											{(() => {
												const p = presets.find(
													(pp) => pp.id === selectedPreset,
												);
												return p ? (
													<span
														data-slot="select-value"
														className="flex flex-1 text-left text-sm"
													>
														{p.name}
													</span>
												) : (
													<SelectValue placeholder="Select preset" />
												);
											})()}
										</SelectTrigger>
										<SelectContent>
											{presets.map((p) => (
												<SelectItem key={p.id} value={p.id}>
													{p.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Expected Income</Label>
									<Input
										type="number"
										step="0.01"
										value={expectedIncome}
										onChange={(e) => setExpectedIncome(e.target.value)}
									/>
								</div>
							</div>
							<Button
								onClick={handleApply}
								disabled={applyMutation.isPending || !selectedPreset}
							>
								Apply Preset
							</Button>
							{applyMutation.isError && (
								<p className="text-sm text-destructive">
									Unable to apply preset
								</p>
							)}
						</div>
					)}

					{/* Budget exists — show summary + editable allocations */}
					{monthly && allocations && (
						<div className="space-y-4 pt-2 border-t">
							{/* Income row */}
							<div className="flex items-center gap-3">
								{editingIncome ? (
									<>
										<Label className="shrink-0">Expected Income</Label>
										<Input
											type="number"
											step="0.01"
											className="w-36"
											value={incomeInput}
											onChange={(e) => setIncomeInput(e.target.value)}
											autoFocus
										/>
										<Button
											size="sm"
											onClick={() =>
												updateIncomeMutation.mutate(Number(incomeInput))
											}
											disabled={updateIncomeMutation.isPending}
										>
											Save
										</Button>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => setEditingIncome(false)}
										>
											Cancel
										</Button>
									</>
								) : (
									<>
										<span className="text-sm text-muted-foreground">
											Expected Income:
										</span>
										<span className="font-semibold">
											{Number(monthly.expectedIncome).toFixed(2)}
										</span>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => {
												setIncomeInput(
													Number(monthly.expectedIncome).toFixed(2),
												);
												setEditingIncome(true);
											}}
										>
											Edit
										</Button>
									</>
								)}
							</div>

							{/* Summary */}
							<div className="grid grid-cols-3 gap-4 text-sm">
								<div className="rounded-md bg-muted/50 px-3 py-2">
									<p className="text-muted-foreground">Total Allocated</p>
									<p className="font-semibold">{totalAllocated.toFixed(2)}</p>
								</div>
								<div className="rounded-md bg-muted/50 px-3 py-2">
									<p className="text-muted-foreground">Remaining</p>
									<p
										className={`font-semibold ${Number(monthly.expectedIncome) - totalAllocated < 0 ? "text-destructive" : ""}`}
									>
										{(Number(monthly.expectedIncome) - totalAllocated).toFixed(
											2,
										)}
									</p>
								</div>
							</div>

							{/* Allocations */}
							<div className="space-y-2">
								<p className="text-sm font-medium">Allocations</p>
								{allocations.map((a) => {
									const isEditing = a.id in editingAlloc;
									return (
										<div
											key={a.id}
											className="flex items-center gap-2 rounded-md border px-3 py-2"
										>
											<span className="flex-1 text-sm">
												{a.categoryName || a.categoryGroupName || "Unnamed"}
											</span>
											{isEditing ? (
												<>
													<Input
														type="number"
														step="0.01"
														className="w-28 h-7 text-sm"
														value={editingAlloc[a.id]}
														onChange={(e) =>
															setEditingAlloc((prev) => ({
																...prev,
																[a.id]: e.target.value,
															}))
														}
														autoFocus
													/>
													<Button
														size="sm"
														className="h-7 text-xs"
														onClick={() =>
															updateAllocM.mutate({
																id: a.id,
																amount: Number(editingAlloc[a.id]),
															})
														}
														disabled={updateAllocM.isPending}
													>
														Save
													</Button>
													<Button
														size="sm"
														variant="ghost"
														className="h-7 text-xs"
														onClick={() =>
															setEditingAlloc((prev) => {
																const next = { ...prev };
																delete next[a.id];
																return next;
															})
														}
													>
														Cancel
													</Button>
												</>
											) : (
												<>
													<span className="text-sm font-medium w-24 text-right">
														{Number(a.allocatedAmount).toFixed(2)}
													</span>
													<Button
														size="sm"
														variant="ghost"
														className="h-7 text-xs"
														onClick={() =>
															setEditingAlloc((prev) => ({
																...prev,
																[a.id]: Number(a.allocatedAmount).toFixed(2),
															}))
														}
													>
														Edit
													</Button>
													<Button
														size="sm"
														variant="ghost"
														className="h-7 text-xs text-destructive"
														onClick={() => deleteAllocM.mutate(a.id)}
														disabled={deleteAllocM.isPending}
													>
														Delete
													</Button>
												</>
											)}
										</div>
									);
								})}
							</div>

							{/* Apply different preset */}
							<div className="pt-2 border-t space-y-2">
								<p className="text-sm font-medium text-muted-foreground">
									Replace with a different preset
								</p>
								<div className="flex gap-2 flex-wrap">
									<Select
										value={selectedPreset}
										onValueChange={(v) => setSelectedPreset(v ?? "")}
									>
										<SelectTrigger className="w-48">
											{(() => {
												const p = presets.find(
													(pp) => pp.id === selectedPreset,
												);
												return p ? (
													<span
														data-slot="select-value"
														className="flex flex-1 text-left text-sm"
													>
														{p.name}
													</span>
												) : (
													<SelectValue placeholder="Select preset" />
												);
											})()}
										</SelectTrigger>
										<SelectContent>
											{presets.map((p) => (
												<SelectItem key={p.id} value={p.id}>
													{p.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button
										variant="outline"
										onClick={handleApply}
										disabled={applyMutation.isPending || !selectedPreset}
									>
										Apply
									</Button>
									<Button
										variant="destructive"
										onClick={() => deleteMonthlyM.mutate()}
										disabled={deleteMonthlyM.isPending}
									>
										Delete Budget
									</Button>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
