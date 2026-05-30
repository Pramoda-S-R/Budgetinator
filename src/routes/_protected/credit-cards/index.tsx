import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { toast } from "sonner";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "#/components/ui/accordion";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	type ChartConfig,
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
import { createAccountsDataAccess } from "#/features/accounts/data-access";
import { createCategoriesDataAccess } from "#/features/categories/data-access";
import { createCreditCardsDataAccess } from "#/features/credit-cards/data-access";
import { createProfileDataAccess } from "#/features/profile/data-access";
import useCurrentUser from "#/hooks/use-current-user";
import { toLocalDateInputValue } from "#/lib/date";

type CreditCardSettings = {
	creditLimit: string;
	nextBillingDate: string;
};

type BillDraft = {
	sourceAccountId: string;
	categoryId: string;
	customAmount: string;
	emiAmount: string;
	emiLabel: string;
};

type UtilizationStatus = {
	label: string;
	description: string;
	textClass: string;
	barClass: string;
};

const PAYMENT_SOURCE_TYPES = new Set(["bank", "cash", "wallet", "salary"]);

const UTILIZATION_CHART_CONFIG = {
	used: {
		label: "Used",
		color: "#dc2626",
	},
	available: {
		label: "Available",
		color: "#16a34a",
	},
} satisfies ChartConfig;

export const Route = createFileRoute("/_protected/credit-cards/")({
	component: CreditCardsPage,
});

function getOutstanding(raw: string): number {
	const value = Number(raw);
	return Number.isFinite(value) ? Math.abs(value) : 0;
}

function fmt(value: number, currencyCode: string): string {
	return `${currencyCode} ${value.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function getUtilizationStatus(percent: number): UtilizationStatus {
	if (percent === 0) {
		return {
			label: "No reported usage",
			description:
				"0% can be fine, but small reported balances may help some models.",
			textClass: "text-slate-600",
			barClass: "bg-slate-500",
		};
	}

	if (percent < 10) {
		return {
			label: "Excellent",
			description: "Usage is in the most score-friendly range.",
			textClass: "text-emerald-600",
			barClass: "bg-emerald-500",
		};
	}

	if (percent < 30) {
		return {
			label: "Acceptable",
			description:
				"Still under 30%, but higher than ideal for score optimization.",
			textClass: "text-amber-600",
			barClass: "bg-amber-500",
		};
	}

	if (percent <= 100) {
		return {
			label: "High utilization",
			description: "Above the common 30% guideline.",
			textClass: "text-red-600",
			barClass: "bg-red-500",
		};
	}

	return {
		label: "Over limit",
		description: "Balance is above the card limit.",
		textClass: "text-red-700",
		barClass: "bg-red-700",
	};
}

function DatePicker({
	id,
	value,
	onChange,
	placeholder,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
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

function CreditCardsPage() {
	const currentUser = useCurrentUser();
	const queryClient = useQueryClient();
	const accountsApi = useMemo(
		() => createAccountsDataAccess(currentUser),
		[currentUser],
	);
	const categoriesApi = useMemo(
		() => createCategoriesDataAccess(currentUser),
		[currentUser],
	);
	const creditCardsApi = useMemo(
		() => createCreditCardsDataAccess(currentUser),
		[currentUser],
	);
	const profileApi = useMemo(
		() => createProfileDataAccess(currentUser),
		[currentUser],
	);

	const [settings, setSettings] = useState<Record<string, CreditCardSettings>>(
		{},
	);
	const [billDrafts, setBillDrafts] = useState<Record<string, BillDraft>>({});
	const [newCardName, setNewCardName] = useState("");
	const [newCardOutstanding, setNewCardOutstanding] = useState("0");
	const [newCardLimit, setNewCardLimit] = useState("");
	const [newCardBillingDate, setNewCardBillingDate] = useState(
		toLocalDateInputValue(new Date()),
	);
	const [cardPendingDelete, setCardPendingDelete] = useState<{
		id: string;
		name: string;
	} | null>(null);

	const accountsQuery = useQuery({
		queryKey: ["accounts", currentUser?.id],
		queryFn: () => accountsApi.fetchAccounts(),
		enabled: Boolean(currentUser?.id),
	});

	const categoriesQuery = useQuery({
		queryKey: ["categories", currentUser?.id],
		queryFn: () => categoriesApi.fetchCategories(),
		enabled: Boolean(currentUser?.id),
	});

	const profileQuery = useQuery({
		queryKey: ["profile", currentUser?.id],
		queryFn: () => profileApi.fetchProfile(),
		enabled: Boolean(currentUser?.id),
	});

	const accounts = accountsQuery.data?.accounts ?? [];
	const creditCards = useMemo(
		() =>
			accounts
				.filter((account) => account.accountType === "credit_card")
				.sort((left, right) => left.name.localeCompare(right.name)),
		[accounts],
	);
	const paymentAccounts = useMemo(
		() =>
			accounts
				.filter((account) => PAYMENT_SOURCE_TYPES.has(account.accountType))
				.sort((left, right) => left.name.localeCompare(right.name)),
		[accounts],
	);
	const expenseCategories = useMemo(
		() =>
			(categoriesQuery.data?.categories ?? [])
				.filter((category) => category.transactionType === "expense")
				.sort((left, right) => left.name.localeCompare(right.name)),
		[categoriesQuery.data?.categories],
	);

	const accountNameById = useMemo(
		() => new Map(paymentAccounts.map((account) => [account.id, account.name])),
		[paymentAccounts],
	);
	const categoryNameById = useMemo(
		() =>
			new Map(
				expenseCategories.map((category) => [category.id, category.name]),
			),
		[expenseCategories],
	);

	const currencyCode = profileQuery.data?.profile.currencyCode ?? "INR";

	const creditLimitSummary = useMemo(() => {
		let totalOutstanding = 0;
		let totalLimit = 0;

		for (const card of creditCards) {
			totalOutstanding += getOutstanding(card.currentBalance);

			const configuredLimit = Number(
				(settings[card.id]?.creditLimit ?? card.creditLimit) || 0,
			);
			if (Number.isFinite(configuredLimit) && configuredLimit > 0) {
				totalLimit += configuredLimit;
			}
		}

		const normalizedOutstanding = Math.max(totalOutstanding, 0);
		const usedWithinLimit =
			totalLimit > 0 ? Math.min(normalizedOutstanding, totalLimit) : 0;
		const availableLimit = Math.max(totalLimit - normalizedOutstanding, 0);
		const overLimitAmount = Math.max(normalizedOutstanding - totalLimit, 0);
		const usagePercent =
			totalLimit > 0
				? Number(((normalizedOutstanding / totalLimit) * 100).toFixed(1))
				: 0;
		const availablePercent =
			totalLimit > 0
				? Number(((availableLimit / totalLimit) * 100).toFixed(1))
				: 0;

		return {
			totalOutstanding: normalizedOutstanding,
			totalLimit,
			usedWithinLimit,
			availableLimit,
			overLimitAmount,
			usagePercent,
			availablePercent,
			hasLimit: totalLimit > 0,
		};
	}, [creditCards, settings]);

	const utilizationChartData = useMemo(
		() => [
			{
				key: "used",
				label: "Used",
				value: creditLimitSummary.usedWithinLimit,
				fill: "var(--color-used)",
			},
			{
				key: "available",
				label: "Available",
				value: creditLimitSummary.availableLimit,
				fill: "var(--color-available)",
			},
		],
		[creditLimitSummary.availableLimit, creditLimitSummary.usedWithinLimit],
	);

	const createCardMutation = useMutation({
		mutationFn: (input: {
			name: string;
			currentBalance: number;
			creditLimit: number;
			nextBillingDate: string;
		}) =>
			accountsApi.createAccount({
				name: input.name,
				accountType: "credit_card",
				currentBalance: input.currentBalance,
				creditLimit: input.creditLimit,
				nextBillingDate: input.nextBillingDate,
				recordedAt: toLocalDateInputValue(new Date()),
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["accounts", currentUser?.id],
			});
			setNewCardName("");
			setNewCardOutstanding("0");
			setNewCardLimit("");
			setNewCardBillingDate(toLocalDateInputValue(new Date()));
			toast.success("Credit card added.");
		},
	});

	const updateCardMutation = useMutation({
		mutationFn: (payload: {
			accountId: string;
			creditLimit: number | null;
			nextBillingDate: string | null;
		}) =>
			accountsApi.updateAccount(payload.accountId, {
				creditLimit: payload.creditLimit,
				nextBillingDate: payload.nextBillingDate,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["accounts", currentUser?.id],
			});
			toast.success("Card details saved.");
		},
	});

	const deleteCardMutation = useMutation({
		mutationFn: (accountId: string) => accountsApi.deleteAccount(accountId),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["accounts", currentUser?.id],
			});
			toast.success("Credit card deleted.");
		},
	});

	const payBillMutation = useMutation({
		mutationFn: (payload: {
			creditCardAccountId: string;
			action: "pay_full" | "pay_custom" | "convert_to_emi";
			sourceAccountId?: string;
			customAmount?: number;
			categoryId: string;
			emiAmount?: number;
			emiLabel?: string;
		}) => creditCardsApi.payCreditCardBill(payload),
		onSuccess: async (result) => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["accounts", currentUser?.id],
				}),
				queryClient.invalidateQueries({
					queryKey: ["transactions", currentUser?.id],
				}),
			]);
			toast.success(
				`Payment recorded. Outstanding now ${result.payment.outstandingAfter}.`,
			);
		},
	});

	useEffect(() => {
		setSettings((prev) => {
			const next = { ...prev };
			for (const card of creditCards) {
				next[card.id] ??= {
					creditLimit: card.creditLimit ?? "",
					nextBillingDate: card.nextBillingDate ?? "",
				};
			}
			return next;
		});
	}, [creditCards]);

	useEffect(() => {
		const defaultSourceId = paymentAccounts[0]?.id ?? "";
		const defaultCategoryId = expenseCategories[0]?.id ?? "";

		setBillDrafts((prev) => {
			const next = { ...prev };
			for (const card of creditCards) {
				next[card.id] ??= {
					sourceAccountId: defaultSourceId,
					categoryId: defaultCategoryId,
					customAmount: "",
					emiAmount: "",
					emiLabel: `EMI: ${card.name}`,
				};
			}
			return next;
		});
	}, [creditCards, paymentAccounts, expenseCategories]);

	function updateSetting(
		accountId: string,
		field: keyof CreditCardSettings,
		value: string,
	) {
		setSettings((prev) => ({
			...prev,
			[accountId]: {
				...(prev[accountId] ?? { creditLimit: "", nextBillingDate: "" }),
				[field]: value,
			},
		}));
	}

	function updateDraft(
		accountId: string,
		field: keyof BillDraft,
		value: string | null,
	) {
		setBillDrafts((prev) => ({
			...prev,
			[accountId]: {
				...(prev[accountId] ?? {
					sourceAccountId: "",
					categoryId: "",
					customAmount: "",
					emiAmount: "",
					emiLabel: "",
				}),
				[field]: value ?? "",
			},
		}));
	}

	async function addCard() {
		const name = newCardName.trim();
		const outstanding = Number(newCardOutstanding);
		const creditLimit = Number(newCardLimit);

		if (!name) {
			toast.error("Card name is required.");
			return;
		}

		if (!Number.isFinite(outstanding) || outstanding < 0) {
			toast.error("Outstanding amount must be 0 or more.");
			return;
		}

		if (!Number.isFinite(creditLimit) || creditLimit <= 0) {
			toast.error("Credit limit must be greater than 0.");
			return;
		}

		if (!newCardBillingDate) {
			toast.error("Next billing date is required.");
			return;
		}

		try {
			await createCardMutation.mutateAsync({
				name,
				currentBalance: -Math.abs(outstanding),
				creditLimit,
				nextBillingDate: newCardBillingDate,
			});
		} catch {
			toast.error("Unable to create credit card.");
		}
	}

	async function saveCard(accountId: string) {
		const value = settings[accountId];
		const rawLimit = value?.creditLimit.trim() ?? "";
		const nextBillingDate = value?.nextBillingDate?.trim() || null;

		let creditLimit: number | null = null;
		if (rawLimit) {
			const parsed = Number(rawLimit);
			if (!Number.isFinite(parsed) || parsed <= 0) {
				toast.error("Credit limit must be greater than 0.");
				return;
			}
			creditLimit = parsed;
		}

		try {
			await updateCardMutation.mutateAsync({
				accountId,
				creditLimit,
				nextBillingDate,
			});
		} catch {
			toast.error("Unable to save card details.");
		}
	}

	async function removeCard(accountId: string, name: string) {
		setCardPendingDelete({ id: accountId, name });
	}

	async function confirmDeleteCard() {
		if (!cardPendingDelete) {
			return;
		}

		try {
			await deleteCardMutation.mutateAsync(cardPendingDelete.id);
			setCardPendingDelete(null);
		} catch {
			toast.error("Unable to delete credit card.");
		}
	}

	async function payBill(
		cardId: string,
		action: "pay_full" | "pay_custom" | "convert_to_emi",
		outstanding: number,
	) {
		const draft = billDrafts[cardId];
		if (!draft?.categoryId) {
			toast.error("Select a category first.");
			return;
		}

		if (outstanding <= 0) {
			toast.error("No outstanding balance to process.");
			return;
		}

		const payload: {
			creditCardAccountId: string;
			action: "pay_full" | "pay_custom" | "convert_to_emi";
			sourceAccountId?: string;
			customAmount?: number;
			categoryId: string;
			emiAmount?: number;
			emiLabel?: string;
		} = {
			creditCardAccountId: cardId,
			action,
			categoryId: draft.categoryId,
		};

		if (action === "pay_full" || action === "pay_custom") {
			if (!draft.sourceAccountId) {
				toast.error("Choose a payment account.");
				return;
			}
			payload.sourceAccountId = draft.sourceAccountId;
		}

		if (action === "pay_custom") {
			const customAmount = Number(draft.customAmount);
			if (!Number.isFinite(customAmount) || customAmount <= 0) {
				toast.error("Enter a valid custom payment amount.");
				return;
			}
			if (customAmount > outstanding) {
				toast.error("Custom amount cannot exceed outstanding.");
				return;
			}
			payload.customAmount = customAmount;
		}

		if (action === "convert_to_emi") {
			const amount = Number(draft.emiAmount);
			if (!Number.isFinite(amount) || amount <= 0) {
				toast.error("Enter a valid EMI conversion amount.");
				return;
			}
			if (amount > outstanding) {
				toast.error("EMI amount cannot exceed outstanding.");
				return;
			}
			payload.emiAmount = amount;
			payload.emiLabel = draft.emiLabel.trim() || undefined;
		}

		try {
			await payBillMutation.mutateAsync(payload);
		} catch {
			toast.error("Unable to process bill payment.");
		}
	}

	return (
		<div className="space-y-6 p-6">
			<AlertDialog
				open={Boolean(cardPendingDelete)}
				onOpenChange={(open) => {
					if (!open) {
						setCardPendingDelete(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Credit Card</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently deletes
							{cardPendingDelete ? `"${cardPendingDelete.name}"` : "this card"}
							and removes it from Accounts.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => void confirmDeleteCard()}
							disabled={deleteCardMutation.isPending}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Card>
				<CardHeader>
					<CardTitle>Credit Cards</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Add and manage your cards in one place.
					</p>
					<div className="grid gap-3 md:grid-cols-5">
						<div className="space-y-2">
							<Label htmlFor="new-card-name">Card Name</Label>
							<Input
								id="new-card-name"
								value={newCardName}
								onChange={(event) => setNewCardName(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="new-card-outstanding">
								Current Outstanding Amount
							</Label>
							<Input
								id="new-card-outstanding"
								type="number"
								min="0"
								step="0.01"
								value={newCardOutstanding}
								onChange={(event) => setNewCardOutstanding(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="new-card-limit">Credit Limit</Label>
							<Input
								id="new-card-limit"
								type="number"
								min="0"
								step="0.01"
								value={newCardLimit}
								onChange={(event) => setNewCardLimit(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="new-card-billing-date">Next Billing Date</Label>
							<DatePicker
								id="new-card-billing-date"
								value={newCardBillingDate}
								onChange={setNewCardBillingDate}
								placeholder="Select date"
							/>
						</div>
						<div className="flex items-end">
							<Button
								className="w-full"
								onClick={addCard}
								disabled={createCardMutation.isPending}
							>
								Add Credit Card
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
				<Card>
					<CardHeader>
						<CardTitle>Cards</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<Accordion multiple className="space-y-2">
							{creditCards.map((card) => {
								const outstanding = getOutstanding(card.currentBalance);
								const draft = billDrafts[card.id] ?? {
									sourceAccountId: "",
									categoryId: "",
									customAmount: "",
									emiAmount: "",
									emiLabel: `EMI: ${card.name}`,
								};

								const configuredLimit = Number(
									(settings[card.id]?.creditLimit ?? card.creditLimit) || 0,
								);
								const hasLimit =
									Number.isFinite(configuredLimit) && configuredLimit > 0;
								const utilization = hasLimit
									? (outstanding / configuredLimit) * 100
									: 0;
								const safeUtilization = Number(utilization.toFixed(1));
								const statusForUtilization =
									getUtilizationStatus(safeUtilization);
								const usageBarWidth = Math.min(
									Math.max(safeUtilization, 0),
									100,
								);
								const billingDate =
									settings[card.id]?.nextBillingDate ??
									card.nextBillingDate ??
									"";

								return (
									<AccordionItem
										key={card.id}
										value={card.id}
										className="border border-border bg-card px-4"
									>
										<AccordionTrigger className="py-3 text-left hover:no-underline">
											<div className="grid w-full gap-2 pr-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
												<div className="min-w-0">
													<p className="flex items-center gap-2 text-sm font-medium">
														<CreditCard className="size-4" />
														<span className="truncate">{card.name}</span>
													</p>
													<p className="text-xs text-muted-foreground">
														{billingDate
															? `Billing date ${billingDate}`
															: "Billing date not set"}
													</p>
												</div>
												<p className="text-xs text-muted-foreground sm:text-right">
													Outstanding
													<br />
													<span className="text-sm font-semibold text-foreground">
														{fmt(outstanding, currencyCode)}
													</span>
												</p>
												{hasLimit ? (
													<p
														className={`self-end text-xs font-medium sm:self-center ${statusForUtilization.textClass}`}
													>
														{safeUtilization}% used
													</p>
												) : (
													<p className="self-end text-xs text-muted-foreground sm:self-center">
														No limit
													</p>
												)}
											</div>
										</AccordionTrigger>

										<AccordionContent className="pt-2 pb-4">
											{hasLimit ? (
												<div className="space-y-1.5">
													<div className="h-1.5 w-full bg-muted/70">
														<div
															className={`h-full transition-all ${statusForUtilization.barClass}`}
															style={{ width: `${usageBarWidth}%` }}
														/>
													</div>
													<p
														className={`text-xs ${statusForUtilization.textClass}`}
													>
														{statusForUtilization.label} -{" "}
														{statusForUtilization.description}
													</p>
												</div>
											) : null}

											<div className="mt-4 grid gap-3 lg:grid-cols-2">
												<div className="space-y-3 border border-border/70 bg-muted/20 p-3">
													<p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
														Card Settings
													</p>
													<div className="grid gap-3 sm:grid-cols-2">
														<div className="space-y-2">
															<Label htmlFor={`limit-${card.id}`}>
																Credit Limit
															</Label>
															<Input
																id={`limit-${card.id}`}
																type="number"
																min="0"
																step="0.01"
																value={settings[card.id]?.creditLimit ?? ""}
																onChange={(event) =>
																	updateSetting(
																		card.id,
																		"creditLimit",
																		event.target.value,
																	)
																}
															/>
														</div>
														<div className="space-y-2">
															<Label htmlFor={`bill-date-${card.id}`}>
																Next Billing Date
															</Label>
															<DatePicker
																id={`bill-date-${card.id}`}
																value={settings[card.id]?.nextBillingDate ?? ""}
																onChange={(value) =>
																	updateSetting(
																		card.id,
																		"nextBillingDate",
																		value,
																	)
																}
																placeholder="Select date"
															/>
														</div>
													</div>
													<div className="flex flex-wrap gap-2">
														<Button
															size="sm"
															onClick={() => saveCard(card.id)}
															disabled={updateCardMutation.isPending}
														>
															Save Details
														</Button>
														<Button
															size="sm"
															variant="destructive"
															onClick={() => removeCard(card.id, card.name)}
															disabled={deleteCardMutation.isPending}
														>
															Delete
														</Button>
													</div>
												</div>

												<div className="space-y-3 border border-border/70 bg-muted/20 p-3">
													<p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
														Payment Setup
													</p>
													<div className="grid gap-3 sm:grid-cols-2">
														<div className="space-y-2">
															<Label>Payment Account</Label>
															<Select
																value={draft.sourceAccountId}
																onValueChange={(value) =>
																	updateDraft(card.id, "sourceAccountId", value)
																}
															>
																<SelectTrigger>
																	<SelectValue placeholder="Select account">
																		{draft.sourceAccountId
																			? accountNameById.get(
																					draft.sourceAccountId,
																				)
																			: undefined}
																	</SelectValue>
																</SelectTrigger>
																<SelectContent>
																	{paymentAccounts.map((account) => (
																		<SelectItem
																			key={account.id}
																			value={account.id}
																		>
																			{account.name}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
														</div>
														<div className="space-y-2">
															<Label>Category</Label>
															<Select
																value={draft.categoryId}
																onValueChange={(value) =>
																	updateDraft(card.id, "categoryId", value)
																}
															>
																<SelectTrigger>
																	<SelectValue placeholder="Select category">
																		{draft.categoryId
																			? categoryNameById.get(draft.categoryId)
																			: undefined}
																	</SelectValue>
																</SelectTrigger>
																<SelectContent>
																	{expenseCategories.map((category) => (
																		<SelectItem
																			key={category.id}
																			value={category.id}
																		>
																			{category.name}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
														</div>
													</div>
													<div className="grid gap-3 sm:grid-cols-3">
														<div className="space-y-2">
															<Label htmlFor={`custom-amount-${card.id}`}>
																Custom Amount
															</Label>
															<Input
																id={`custom-amount-${card.id}`}
																type="number"
																min="0"
																step="0.01"
																placeholder="0.00"
																value={draft.customAmount}
																onChange={(event) =>
																	updateDraft(
																		card.id,
																		"customAmount",
																		event.target.value,
																	)
																}
															/>
														</div>
														<div className="space-y-2">
															<Label htmlFor={`emi-amount-${card.id}`}>
																EMI Convert Amount
															</Label>
															<Input
																id={`emi-amount-${card.id}`}
																type="number"
																min="0"
																step="0.01"
																value={draft.emiAmount}
																onChange={(event) =>
																	updateDraft(
																		card.id,
																		"emiAmount",
																		event.target.value,
																	)
																}
															/>
														</div>
														<div className="space-y-2 sm:col-span-3">
															<Label htmlFor={`emi-label-${card.id}`}>
																EMI Label
															</Label>
															<Input
																id={`emi-label-${card.id}`}
																value={draft.emiLabel}
																onChange={(event) =>
																	updateDraft(
																		card.id,
																		"emiLabel",
																		event.target.value,
																	)
																}
															/>
														</div>
													</div>
												</div>
											</div>

											<div className="mt-3 border border-border/70 bg-muted/20 p-3">
												<p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
													Bill Actions
												</p>
												<div className="mt-2 flex flex-wrap gap-2">
													<Button
														size="sm"
														onClick={() =>
															payBill(card.id, "pay_full", outstanding)
														}
														disabled={payBillMutation.isPending}
													>
														Pay Full ({fmt(outstanding, currencyCode)})
													</Button>
													<Button
														size="sm"
														variant="outline"
														onClick={() =>
															payBill(card.id, "pay_custom", outstanding)
														}
														disabled={payBillMutation.isPending}
													>
														Pay Custom Amount
													</Button>
													<Button
														size="sm"
														variant="secondary"
														onClick={() =>
															payBill(card.id, "convert_to_emi", outstanding)
														}
														disabled={payBillMutation.isPending}
													>
														Convert to EMI
													</Button>
												</div>
											</div>
										</AccordionContent>
									</AccordionItem>
								);
							})}
						</Accordion>

						{!accountsQuery.isLoading && creditCards.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No credit cards yet.
							</p>
						) : null}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Limit Snapshot</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{creditLimitSummary.hasLimit ? (
							<>
								<ChartContainer
									id="credit-card-limit-snapshot"
									config={UTILIZATION_CHART_CONFIG}
									className="h-52 w-full aspect-auto"
								>
									<PieChart>
										<Pie
											data={utilizationChartData}
											dataKey="value"
											nameKey="label"
											innerRadius={48}
											outerRadius={74}
											paddingAngle={2}
										>
											{utilizationChartData.map((slice) => (
												<Cell key={slice.key} fill={slice.fill} />
											))}
										</Pie>
										<ChartTooltip
											content={
												<ChartTooltipContent
													className="bg-muted text-foreground ring-border/60"
													formatter={(value, name, item) => (
														<div className="flex w-full items-center justify-between gap-3">
															<span
																className="font-medium"
																style={{
																	color: item.color ?? "hsl(var(--foreground))",
																}}
															>
																{String(name)}
															</span>
															<span
																className="font-mono font-semibold tabular-nums"
																style={{
																	color: item.color ?? "hsl(var(--foreground))",
																}}
															>
																{fmt(Number(value), currencyCode)}
															</span>
														</div>
													)}
												/>
											}
										/>
									</PieChart>
								</ChartContainer>

								<div className="grid grid-cols-2 gap-3 text-sm">
									<div className="space-y-1 border border-border/70 p-2">
										<p className="text-xs text-muted-foreground">Used</p>
										<p className="font-semibold text-red-600">
											{creditLimitSummary.usagePercent}%
										</p>
										<p className="text-xs text-muted-foreground">
											{fmt(creditLimitSummary.totalOutstanding, currencyCode)}
										</p>
									</div>
									<div className="space-y-1 border border-border/70 p-2">
										<p className="text-xs text-muted-foreground">Available</p>
										<p className="font-semibold text-emerald-600">
											{creditLimitSummary.availablePercent}%
										</p>
										<p className="text-xs text-muted-foreground">
											{fmt(creditLimitSummary.availableLimit, currencyCode)}
										</p>
									</div>
								</div>

								<p className="text-xs text-muted-foreground">
									Total credit limit:{" "}
									{fmt(creditLimitSummary.totalLimit, currencyCode)}
								</p>
								{creditLimitSummary.overLimitAmount > 0 ? (
									<p className="text-xs text-destructive">
										Over limit by{" "}
										{fmt(creditLimitSummary.overLimitAmount, currencyCode)}
									</p>
								) : null}
							</>
						) : (
							<p className="text-sm text-muted-foreground">
								Add credit limits to cards to view a usage chart.
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
