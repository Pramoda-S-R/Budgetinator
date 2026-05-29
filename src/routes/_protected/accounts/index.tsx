import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import type { Account } from "#/features/accounts/data-access";
import { createAccountsDataAccess } from "#/features/accounts/data-access";
import { calculateNetWorth } from "#/features/accounts/net-worth";
import { createProfileDataAccess } from "#/features/profile/data-access";
import useCurrentUser from "#/hooks/use-current-user";

const ACCOUNT_TYPE_OPTIONS = [
	{ value: "bank", label: "Bank" },
	{ value: "cash", label: "Cash" },
	{ value: "wallet", label: "Wallet" },
	{ value: "credit_card", label: "Credit Card" },
	{ value: "investment", label: "Investment" },
	{ value: "salary", label: "Salary" },
	{ value: "loan", label: "Loan" },
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
	const [error, setError] = useState<string | null>(null);

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
		}) => accountsApi.createAccount(input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["accounts", currentUser?.id],
			});
			setName("");
			setCurrentBalance("0");
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

	const totalNetWorthLabel = useMemo(() => {
		const value = Number(totalNetWorth);
		const fallback = calculateNetWorth(accounts);
		const safeValue = Number.isFinite(value) ? value : fallback;

		return safeValue.toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	}, [accounts, totalNetWorth]);

	async function onCreateAccount(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		try {
			await createAccountMutation.mutateAsync({
				name,
				accountType,
				currentBalance: Number(currentBalance),
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

	async function onUpdateBalance(account: Account) {
		const input = window.prompt(
			`Update balance for ${account.name}`,
			account.currentBalance,
		);
		if (!input) {
			return;
		}

		const value = Number(input);
		if (!Number.isFinite(value)) {
			setError("Balance must be a valid number");
			return;
		}

		try {
			await updateAccountMutation.mutateAsync({
				accountId: account.id,
				currentBalance: value,
			});
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
					<CardTitle>Accounts</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">Total Net Worth</p>
					<p className="text-3xl font-semibold">
						{currencyCode} {totalNetWorthLabel}
					</p>

					<form
						onSubmit={onCreateAccount}
						className="grid gap-3 md:grid-cols-4"
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

					<div className="space-y-3">
						{accounts.map((account) => (
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
										{account.accountType} • {currencyCode}{" "}
										{Number(account.currentBalance).toFixed(2)}
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
				</CardContent>
			</Card>
		</div>
	);
}
