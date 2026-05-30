import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Banknote,
	Briefcase,
	ChevronDown,
	Circle,
	CreditCard,
	HandCoins,
	Landmark,
	type LucideIcon,
	PiggyBank,
	Wallet,
} from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import type { Account } from "#/features/accounts/data-access";
import { createAccountsDataAccess } from "#/features/accounts/data-access";
import { calculateNetWorth } from "#/features/accounts/net-worth";
import { createProfileDataAccess } from "#/features/profile/data-access";
import useCurrentUser from "#/hooks/use-current-user";
import { toLocalDateInputValue } from "#/lib/date";

const ACCOUNT_TYPE_OPTIONS = [
	{ value: "bank", label: "Bank" },
	{ value: "cash", label: "Cash" },
	{ value: "wallet", label: "Wallet" },
	{ value: "salary", label: "Salary" },
];

const ACCOUNT_TYPE_LABELS = ACCOUNT_TYPE_OPTIONS.reduce<Record<string, string>>(
	(labels, option) => {
		labels[option.value] = option.label;
		return labels;
	},
	{},
);

const ACCOUNT_TYPE_ORDER = [
	"bank",
	...ACCOUNT_TYPE_OPTIONS.map((option) => option.value).filter(
		(value) => value !== "bank",
	),
];

const ACCOUNT_TYPE_ICONS: Record<string, LucideIcon> = {
	bank: Landmark,
	cash: Banknote,
	wallet: Wallet,
	credit_card: CreditCard,
	investment: PiggyBank,
	salary: Briefcase,
	loan: HandCoins,
};

function getAccountTypeIcon(accountType: string): LucideIcon {
	return ACCOUNT_TYPE_ICONS[accountType] ?? Circle;
}

function getAccountTypeLabel(accountType: string): string {
	return ACCOUNT_TYPE_LABELS[accountType] ?? accountType;
}

function AccountTypeIcon({ accountType }: { accountType: string }) {
	const Icon = getAccountTypeIcon(accountType);
	return <Icon className="size-4" />;
}

function AccountTypeSelect({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const selected = ACCOUNT_TYPE_OPTIONS.find(
		(option) => option.value === value,
	);
	const SelectedIcon = getAccountTypeIcon(selected?.value ?? "");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="outline"
						className="h-9 w-full justify-between rounded-none px-3 text-sm font-normal"
					>
						<span className="flex items-center gap-2">
							<SelectedIcon className="size-4" />
							<span>{selected?.label ?? "Select type"}</span>
						</span>
						<ChevronDown className="size-4 text-muted-foreground" />
					</Button>
				}
			/>
			<DropdownMenuContent className="w-56 rounded-none p-1.5" align="start">
				<DropdownMenuRadioGroup
					value={value}
					onValueChange={(nextValue) => onChange(nextValue)}
				>
					{ACCOUNT_TYPE_OPTIONS.map((option) => {
						const OptionIcon = getAccountTypeIcon(option.value);

						return (
							<DropdownMenuRadioItem
								key={option.value}
								value={option.value}
								className="normal-case tracking-normal text-sm"
							>
								<OptionIcon className="size-4" />
								<span>{option.label}</span>
							</DropdownMenuRadioItem>
						);
					})}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function DatePicker({
	id,
	value,
	onChange,
	placeholder = "Select date",
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
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
						required
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

export const Route = createFileRoute("/_protected/accounts/")({
	component: AccountsPage,
});

function AccountsPage() {
	const currentUser = useCurrentUser();
	const queryClient = useQueryClient();
	const accountsApi = useMemo(
		() => createAccountsDataAccess(currentUser),
		[currentUser],
	);
	const profileApi = useMemo(
		() => createProfileDataAccess(currentUser),
		[currentUser],
	);
	const [name, setName] = useState("");
	const [accountType, setAccountType] = useState("bank");
	const [currentBalance, setCurrentBalance] = useState("0");
	const [recordedAt, setRecordedAt] = useState(
		toLocalDateInputValue(new Date()),
	);
	const [error, setError] = useState<string | null>(null);
	const [balanceDialogAccount, setBalanceDialogAccount] =
		useState<Account | null>(null);
	const [balanceDraft, setBalanceDraft] = useState("");

	const accountsQuery = useQuery({
		queryKey: ["accounts", currentUser?.id],
		queryFn: () => accountsApi.fetchAccounts(),
		enabled: Boolean(currentUser?.id),
	});

	const profileQuery = useQuery({
		queryKey: ["profile", currentUser?.id],
		queryFn: () => profileApi.fetchProfile(),
		enabled: Boolean(currentUser?.id),
	});

	const createAccountMutation = useMutation({
		mutationFn: (input: {
			name: string;
			accountType: string;
			currentBalance: number;
			recordedAt: string;
		}) => accountsApi.createAccount(input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["accounts", currentUser?.id],
			});
			setName("");
			setCurrentBalance("0");
			setRecordedAt(toLocalDateInputValue(new Date()));
		},
	});

	const updateAccountMutation = useMutation({
		mutationFn: (payload: { accountId: string; currentBalance: number }) =>
			accountsApi.updateAccount(payload.accountId, {
				currentBalance: payload.currentBalance,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["accounts", currentUser?.id],
			});
		},
	});

	const deleteAccountMutation = useMutation({
		mutationFn: (accountId: string) => accountsApi.deleteAccount(accountId),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["accounts", currentUser?.id],
			});
		},
	});

	const accounts = accountsQuery.data?.accounts ?? [];
	const totalNetWorth = accountsQuery.data?.totalNetWorth ?? "0";
	const currencyCode = profileQuery.data?.profile.currencyCode ?? "USD";

	const groupedAccounts = useMemo(() => {
		const accountsByType = new Map<string, Account[]>();

		for (const account of accounts) {
			const existing = accountsByType.get(account.accountType) ?? [];
			existing.push(account);
			accountsByType.set(account.accountType, existing);
		}

		const orderByType = new Map<string, number>(
			ACCOUNT_TYPE_ORDER.map((accountType, index) => [accountType, index]),
		);

		return Array.from(accountsByType.entries())
			.sort(([leftType], [rightType]) => {
				const leftOrder = orderByType.get(leftType) ?? Number.MAX_SAFE_INTEGER;
				const rightOrder =
					orderByType.get(rightType) ?? Number.MAX_SAFE_INTEGER;

				if (leftOrder !== rightOrder) {
					return leftOrder - rightOrder;
				}

				return getAccountTypeLabel(leftType).localeCompare(
					getAccountTypeLabel(rightType),
				);
			})
			.map(([type, typeAccounts]) => ({
				type,
				label: getAccountTypeLabel(type),
				accounts: [...typeAccounts].sort((left, right) =>
					left.name.localeCompare(right.name),
				),
			}));
	}, [accounts]);

	const totalNetWorthLabel = useMemo(() => {
		const value = Number(totalNetWorth);
		const fallback = calculateNetWorth(accounts);
		const safeValue = Number.isFinite(value) ? value : fallback;

		return safeValue.toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	}, [accounts, totalNetWorth]);

	function formatDisplayedBalance(account: {
		accountType: string;
		currentBalance: string;
	}) {
		const raw = Number(account.currentBalance);
		const safe = Number.isFinite(raw) ? raw : 0;

		if (account.accountType === "credit_card") {
			return Math.abs(safe).toFixed(2);
		}

		return safe.toFixed(2);
	}

	async function onCreateAccount(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		try {
			await createAccountMutation.mutateAsync({
				name,
				accountType,
				currentBalance: Number(currentBalance),
				recordedAt,
			});
		} catch {
			setError("Unable to create account");
		}
	}

	async function onDeleteAccount(accountId: string) {
		setError(null);
		try {
			await deleteAccountMutation.mutateAsync(accountId);
		} catch {
			setError("Unable to delete account");
		}
	}

	function closeBalanceDialog() {
		setBalanceDialogAccount(null);
		setBalanceDraft("");
	}

	function onUpdateBalance(account: Account) {
		setError(null);
		setBalanceDialogAccount(account);
		setBalanceDraft(account.currentBalance);
	}

	async function onSaveBalance(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!balanceDialogAccount) {
			return;
		}

		const value = Number(balanceDraft);
		if (!Number.isFinite(value)) {
			setError("Balance must be a valid number");
			return;
		}

		try {
			await updateAccountMutation.mutateAsync({
				accountId: balanceDialogAccount.id,
				currentBalance: value,
			});
			closeBalanceDialog();
		} catch {
			setError("Unable to update balance");
		}
	}

	return (
		<div className="p-6 space-y-6">
			{!currentUser ? (
				<p className="text-sm text-muted-foreground">Loading your session...</p>
			) : null}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between gap-3">
						<CardTitle>Accounts</CardTitle>
						<Button
							variant="outline"
							render={(props) => (
								<Link {...props} to="/credit-cards">
									Manage Credit Cards
								</Link>
							)}
						/>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">Total Net Worth</p>
					<p className="text-3xl font-semibold">
						{currencyCode} {totalNetWorthLabel}
					</p>

					<form
						onSubmit={onCreateAccount}
						className="grid gap-3 md:grid-cols-5"
					>
						<div className="space-y-2">
							<Label htmlFor="account-name">Name</Label>
							<Input
								id="account-name"
								value={name}
								onChange={(event) => setName(event.target.value)}
								placeholder="Main Bank"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="account-type">Type</Label>
							<AccountTypeSelect
								value={accountType}
								onChange={setAccountType}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="account-balance">Current Balance</Label>
							<Input
								id="account-balance"
								type="number"
								step="0.01"
								value={currentBalance}
								onChange={(event) => setCurrentBalance(event.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="account-recorded-at">Recorded At</Label>
							<DatePicker
								id="account-recorded-at"
								value={recordedAt}
								onChange={setRecordedAt}
							/>
						</div>
						<div className="flex items-end">
							<Button type="submit" className="w-full">
								Add Account
							</Button>
						</div>
					</form>

					{error ? <p className="text-sm text-destructive">{error}</p> : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>My Accounts</CardTitle>
				</CardHeader>
				<CardContent>
					{accountsQuery.isLoading ? (
						<p className="text-sm text-muted-foreground">Loading accounts...</p>
					) : null}

					{accountsQuery.isError ? (
						<p className="text-sm text-destructive">Unable to load accounts</p>
					) : null}

					{!accountsQuery.isLoading && accounts.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No accounts yet. Add your first account above.
						</p>
					) : null}

					<div className="space-y-4">
						{groupedAccounts.map((group) => (
							<div key={group.type} className="space-y-2">
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									{group.label}
								</p>
								<div className="space-y-3">
									{group.accounts.map((account) => (
										<div
											key={account.id}
											className="flex items-center justify-between border p-3"
										>
											<div>
												<p className="flex items-center gap-2 font-medium">
													<AccountTypeIcon accountType={account.accountType} />
													{account.name}
												</p>
												<p className="text-xs text-muted-foreground">
													{account.accountType === "credit_card"
														? "Outstanding: "
														: "Balance: "}
													{currencyCode} {formatDisplayedBalance(account)}
												</p>
											</div>
											<div className="flex gap-2">
												<Button
													variant="outline"
													onClick={() => onUpdateBalance(account)}
												>
													Edit Balance
												</Button>
												<Button
													variant="destructive"
													onClick={() => onDeleteAccount(account.id)}
												>
													Delete
												</Button>
											</div>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Dialog
				open={Boolean(balanceDialogAccount)}
				onOpenChange={(open) => {
					if (!open) {
						closeBalanceDialog();
					}
				}}
			>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Update Balance</DialogTitle>
						<DialogDescription>
							Set the latest balance for {balanceDialogAccount?.name}.
						</DialogDescription>
					</DialogHeader>
					<form className="space-y-4" onSubmit={onSaveBalance}>
						<div className="space-y-2">
							<Label htmlFor="edit-account-balance">Current Balance</Label>
							<Input
								id="edit-account-balance"
								type="number"
								step="0.01"
								value={balanceDraft}
								onChange={(event) => setBalanceDraft(event.target.value)}
								autoFocus
								required
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={closeBalanceDialog}
								disabled={updateAccountMutation.isPending}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={updateAccountMutation.isPending}>
								Save
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
