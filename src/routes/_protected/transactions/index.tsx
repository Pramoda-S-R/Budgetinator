import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDownCircle,
	ArrowUpCircle,
	Calendar as CalendarIcon,
	ListChecks,
	Tag,
	Wallet,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Kbd } from "#/components/ui/kbd";
import { Label } from "#/components/ui/label";
import {
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { Separator } from "#/components/ui/separator";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";

import { fetchAccounts } from "#/features/accounts/data-access";
import {
	type Category,
	fetchCategories,
} from "#/features/categories/data-access";
import { fetchProfile } from "#/features/profile/data-access";
import {
	createTransaction,
	deleteTransaction,
	fetchTransactions,
} from "#/features/transactions/data-access";
import useCurrentUser from "#/hooks/use-current-user";

const TRANSACTION_TYPE_ICON: Record<
	"expense" | "income" | "transfer",
	React.ReactNode
> = {
	expense: <ArrowDownCircle className="size-4" />,
	income: <ArrowUpCircle className="size-4" />,
	transfer: <Wallet className="size-4" />,
};

export const Route = createFileRoute("/_protected/transactions/")({
	component: TransactionsPage,
});

function TransactionsPage() {
	const currentUser = useCurrentUser();
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [amount, setAmount] = useState("");
	const [merchant, setMerchant] = useState("");
	const [notes, setNotes] = useState("");
	const [tagsInput, setTagsInput] = useState("");
	const [accountId, setAccountId] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [transactionType, setTransactionType] = useState<
		"expense" | "income" | "transfer"
	>("expense");
	const [transferAccountId, setTransferAccountId] = useState("");
	const [transactionDate, setTransactionDate] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [isRecurring, setIsRecurring] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const accountsQuery = useQuery({
		queryKey: ["accounts", currentUser?.id],
		queryFn: () => fetchAccounts(currentUser),
		enabled: Boolean(currentUser?.id),
	});

	const categoriesQuery = useQuery({
		queryKey: ["categories", currentUser?.id],
		queryFn: () => fetchCategories(currentUser),
		enabled: Boolean(currentUser?.id),
	});

	const profileQuery = useQuery({
		queryKey: ["profile", currentUser?.id],
		queryFn: () => fetchProfile(currentUser),
		enabled: Boolean(currentUser?.id),
	});

	const transactionsQuery = useQuery({
		queryKey: ["transactions", currentUser?.id],
		queryFn: () => fetchTransactions(currentUser),
		enabled: Boolean(currentUser?.id),
	});

	const accounts = accountsQuery.data?.accounts ?? [];
	const categories = categoriesQuery.data?.categories ?? [];
	const transactions = transactionsQuery.data?.transactions ?? [];
	const currencyCode = profileQuery.data?.profile.currencyCode ?? "USD";

	const accountOptions = useMemo(() => accounts, [accounts]);

	useEffect(() => {
		if (!accountOptions.length) {
			return;
		}

		if (!accountId && accountOptions.length) {
			setAccountId(accountOptions[0].id);
		}
	}, [accountOptions, accountId]);

	useEffect(() => {
		const matching = categories.find(
			(category) => category.transactionType === transactionType,
		);

		if (matching) {
			setCategoryId(matching.id);
		} else if (categories.length && !categoryId) {
			setCategoryId(categories[0].id);
		}
	}, [categories, transactionType, categoryId]);

	useEffect(() => {
		if (transactionType !== "transfer") {
			setTransferAccountId("");
		}
	}, [transactionType]);

	const transactionsByType = useMemo(() => {
		return transactions.reduce(
			(acc, transaction) => {
				const value = Number(transaction.amount) || 0;
				if (transaction.transactionType === "income") {
					acc.income += value;
				} else if (transaction.transactionType === "expense") {
					acc.expense += value;
				}
				return acc;
			},
			{ income: 0, expense: 0 },
		);
	}, [transactions]);

	const netFlow = transactionsByType.income - transactionsByType.expense;

	const formatter = useMemo(() => {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency: currencyCode,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	}, [currencyCode]);

	const recentCategoryIds = useMemo(() => {
		const q: string[] = [];

		for (const transaction of transactions) {
			if (transaction.categoryId && !q.includes(transaction.categoryId)) {
				q.push(transaction.categoryId);
			}

			if (q.length >= 6) {
				break;
			}
		}

		return q;
	}, [transactions]);

	const categoriesMap = useMemo(() => {
		const map = new Map<string, Category>();
		for (const category of categories) {
			map.set(category.id, category);
		}
		return map;
	}, [categories]);

	const recentCategories = recentCategoryIds
		.map((id) => categoriesMap.get(id))
		.filter(Boolean)
		.slice(0, 6) as Category[];

	const transactionMutation = useMutation({
		mutationFn: (payload: Parameters<typeof createTransaction>[0]) =>
			createTransaction(payload, currentUser),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["transactions", currentUser?.id],
				}),
				queryClient.invalidateQueries({
					queryKey: ["accounts", currentUser?.id],
				}),
			]);
			setFormError(null);
			setAmount("");
			setMerchant("");
			setNotes("");
			setTagsInput("");
			setTransferAccountId("");
			setIsRecurring(false);
			setDialogOpen(false);
		},
		onError: () => {
			setFormError("Unable to create transaction");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (transactionId: string) =>
			deleteTransaction(transactionId, currentUser),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["transactions", currentUser?.id],
			});
			await queryClient.invalidateQueries({
				queryKey: ["accounts", currentUser?.id],
			});
		},
	});

	const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFormError(null);

		if (!accountId || !transactionType || !amount) {
			setFormError("Complete required fields");
			return;
		}

		const tagList = Array.from(
			new Set(
				tagsInput
					.split(",")
					.map((tag) => tag.trim())
					.filter(Boolean),
			),
		);

		try {
			await transactionMutation.mutateAsync({
				accountId,
				amount: Number(amount),
				transactionType,
				categoryId: categoryId || undefined,
				merchant: merchant || undefined,
				notes: notes || undefined,
				tags: tagList.length ? tagList : undefined,
				transferAccountId:
					transactionType === "transfer"
						? transferAccountId || undefined
						: undefined,
				transactionDate: transactionDate
					? new Date(transactionDate).toISOString()
					: undefined,
				isRecurring,
			});
		} catch {
			// handled in mutation
		}
	};

	const handleDelete = async (transactionId: string) => {
		await deleteMutation.mutateAsync(transactionId);
	};

	useHotkey("N", () => setDialogOpen(true), { enabled: !dialogOpen });

	return (
		<div className="p-6 space-y-6">
			<Card className="bg-linear-to-br from-slate-900/80 via-slate-900 to-slate-900/70 text-white shadow-lg">
				<CardHeader>
					<div className="flex items-center justify-between gap-2">
						<div>
							<p className="text-xs uppercase tracking-[0.3em] text-white/70">
								Ledger
							</p>
							<CardTitle className="text-3xl text-white">
								Transactions
							</CardTitle>
						</div>
						<Badge variant="ghost">
							Press <Kbd>N</Kbd> to open quick add
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-5xl font-semibold tracking-tight">
						{formatter.format(netFlow)}
					</p>
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<p className="text-xs uppercase tracking-wide text-white/60">
								Income
							</p>
							<p className="text-xl font-semibold text-lime-300">
								{formatter.format(transactionsByType.income)}
							</p>
						</div>
						<div>
							<p className="text-xs uppercase tracking-wide text-white/60">
								Expense
							</p>
							<p className="text-xl font-semibold text-rose-300">
								{formatter.format(transactionsByType.expense)}
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						{recentCategories.length ? (
							recentCategories.map((category) => (
								<Badge
									key={category.id}
									variant="ghost"
									className="border-white/20 bg-white/10 text-white"
								>
									<Tag className="size-3" />
									{category.name}
								</Badge>
							))
						) : (
							<p className="text-xs text-white/60">
								Add a few transactions to surface recent categories
							</p>
						)}
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
				<Card className="space-y-4">
					<CardHeader>
						<div className="flex items-center justify-between gap-2">
							<CardTitle>Quick Add</CardTitle>
							<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
								<DialogTrigger render={<Button variant="secondary" />}>
									+ New transaction
								</DialogTrigger>
								<DialogContent className="max-w-lg">
									<DialogHeader>
										<DialogTitle>Log a transaction</DialogTitle>
										<DialogDescription>
											Keyboard friendly, fast entry with recent categories and
											smart defaults.
										</DialogDescription>
									</DialogHeader>
									<form className="space-y-4" onSubmit={handleCreate}>
										<div className="space-y-2">
											<Label htmlFor="transaction-type">Type</Label>
											<ToggleGroup
												value={[transactionType]}
												onValueChange={(values) => {
													const next = values.find(
														(v) => v !== transactionType,
													);
													if (next)
														setTransactionType(
															next as "expense" | "income" | "transfer",
														);
												}}
											>
												<ToggleGroupItem value="expense">
													Expense
												</ToggleGroupItem>
												<ToggleGroupItem value="income">Income</ToggleGroupItem>
												<ToggleGroupItem value="transfer">
													Transfer
												</ToggleGroupItem>
											</ToggleGroup>
										</div>
										<div className="grid gap-3 md:grid-cols-2">
											<div className="space-y-2">
												<Label htmlFor="transaction-account">Account</Label>
												<NativeSelect
													id="transaction-account"
													value={accountId}
													onChange={(event) => setAccountId(event.target.value)}
												>
													{accountOptions.map((account) => (
														<NativeSelectOption
															key={account.id}
															value={account.id}
														>
															{account.name}
														</NativeSelectOption>
													))}
												</NativeSelect>
											</div>
											{transactionType === "transfer" ? (
												<div className="space-y-2">
													<Label htmlFor="transaction-destination">
														Destination
													</Label>
													<NativeSelect
														id="transaction-destination"
														value={transferAccountId}
														onChange={(event) =>
															setTransferAccountId(event.target.value)
														}
													>
														<NativeSelectOption value="">
															Select account
														</NativeSelectOption>
														{accountOptions
															.filter((account) => account.id !== accountId)
															.map((account) => (
																<NativeSelectOption
																	key={account.id}
																	value={account.id}
																>
																	{account.name}
																</NativeSelectOption>
															))}
													</NativeSelect>
												</div>
											) : null}
										</div>
										<div className="space-y-2">
											<Label htmlFor="transaction-category">Category</Label>
											<NativeSelect
												id="transaction-category"
												value={categoryId}
												onChange={(event) => setCategoryId(event.target.value)}
											>
												<NativeSelectOptGroup label="Categories">
													{categories.map((category) => (
														<NativeSelectOption
															key={category.id}
															value={category.id}
														>
															{category.name}
														</NativeSelectOption>
													))}
												</NativeSelectOptGroup>
											</NativeSelect>
										</div>
										<div className="grid gap-3 md:grid-cols-2">
											<div className="space-y-2">
												<Label htmlFor="transaction-amount">Amount</Label>
												<Input
													id="transaction-amount"
													type="number"
													inputMode="decimal"
													step="0.01"
													min="0"
													value={amount}
													onChange={(event) => setAmount(event.target.value)}
													required
													autoFocus
												/>
											</div>
											<div className="space-y-2">
                                        <Label htmlFor="transaction-date">Date</Label>
                                        <Popover>
                                           <PopoverTrigger
                                             nativeButton={false}
                                             render={
                                              <Input
                                                id="transaction-date"
                                                readOnly
                                                value={transactionDate}
                                                required
                                              />
                                            }
                                          />
                                          <PopoverContent sideOffset={4} align="start">
                                            <Calendar
                                              mode="single"
                                              selected={new Date(
                                                `${transactionDate}T00:00:00`
                                              )}
                                              onSelect={(date) =>
                                                date &&
                                                setTransactionDate(
                                                  date.toISOString().slice(0, 10)
                                                )
                                              }
                                              showOutsideDays={false}
                                            />
                                          </PopoverContent>
                                        </Popover>
											</div>
										</div>
										<div className="space-y-2">
											<Label htmlFor="transaction-merchant">Merchant</Label>
											<Input
												id="transaction-merchant"
												value={merchant}
												onChange={(event) => setMerchant(event.target.value)}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="transaction-tags">Tags</Label>
											<Input
												id="transaction-tags"
												placeholder="Comma separated"
												value={tagsInput}
												onChange={(event) => setTagsInput(event.target.value)}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="transaction-notes">Notes</Label>
											<Textarea
												id="transaction-notes"
												rows={3}
												value={notes}
												onChange={(event) => setNotes(event.target.value)}
											/>
										</div>
										<div className="flex items-center gap-2">
											<Switch
												id="transaction-recurring"
												checked={isRecurring}
												onCheckedChange={(value) =>
													setIsRecurring(Boolean(value))
												}
											/>
											<Label
												htmlFor="transaction-recurring"
												className="text-sm font-medium"
											>
												Mark as recurring
											</Label>
										</div>
										{formError ? (
											<p className="text-sm text-destructive">{formError}</p>
										) : null}
										<DialogFooter>
											<Button
												type="submit"
												variant="secondary"
												className="w-full"
												disabled={transactionMutation.isPending}
											>
												{transactionMutation.isPending ? (
													<Spinner className="mr-2" />
												) : null}
												Save transaction
											</Button>
										</DialogFooter>
									</form>
								</DialogContent>
							</Dialog>
						</div>
						<p className="text-sm text-muted-foreground">
							Keyboard shortcut available
						</p>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm text-muted-foreground">
							Balanced and event-led ledger with searchable history.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Ledger History</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{transactionsQuery.isFetching ? (
							<div className="flex items-center justify-center">
								<Spinner />
							</div>
						) : null}
						{transactions.length === 0 && !transactionsQuery.isFetching ? (
							<p className="text-sm text-muted-foreground">
								No transactions yet. Add a quick entry to build your ledger.
							</p>
						) : null}
						<div className="space-y-3">
							{transactions.map((transaction) => (
								<div
									key={transaction.id}
									className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm"
								>
									<div className="flex items-center justify-between gap-2">
										<div>
											<p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
												{TRANSACTION_TYPE_ICON[transaction.transactionType]}
												{transaction.transactionType}
											</p>
											<p className="text-xl font-semibold">
												{formatter.format(Number(transaction.amount))}
											</p>
										</div>
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<CalendarIcon className="size-4" />
											<span>
												{new Date(
													transaction.transactionDate,
												).toLocaleDateString()}
											</span>
										</div>
									</div>
									<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
										<ListChecks className="size-4" />
										<span>{transaction.categoryName ?? "Uncategorized"}</span>
										<Separator orientation="vertical" className="h-4" />
										<Wallet className="size-4" />
										<span>
											{transaction.accountName}
											{transaction.transferAccountName
												? ` → ${transaction.transferAccountName}`
												: ""}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
										{transaction.tags.map((tag) => (
											<Badge key={tag} variant="outline">
												#{tag}
											</Badge>
										))}
									</div>
									<div className="flex items-center justify-between">
										<p className="text-sm text-muted-foreground">
											{transaction.merchant || "Merchant not specified"}
										</p>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => handleDelete(transaction.id)}
											disabled={deleteMutation.isPending}
										>
											Delete
										</Button>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
import { Popover, PopoverTrigger, PopoverContent } from "#/components/ui/popover";
import { Calendar } from "#/components/ui/calendar";
