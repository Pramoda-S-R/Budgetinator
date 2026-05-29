import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
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
	createLoansDataAccess,
	type EmiPayment,
	type LoanPayment,
} from "#/features/loans/data-access";
import useCurrentUser from "#/hooks/use-current-user";
import { toLocalDateInputValue } from "#/lib/date.ts";

export const Route = createFileRoute("/_protected/loans/")({
	component: LoansPage,
});

const STATUS_COLORS: Record<string, string> = {
	active: "bg-blue-100 text-blue-800",
	paid: "bg-green-100 text-green-800",
	overdue: "bg-red-100 text-red-800",
	completed: "bg-green-100 text-green-800",
	cancelled: "bg-gray-100 text-gray-600",
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

function LoansPage() {
	const user = useCurrentUser();
	const qc = useQueryClient();
	const loansApi = useMemo(() => createLoansDataAccess(user), [user]);
	const accountsApi = useMemo(() => createAccountsDataAccess(user), [user]);
	const categoriesApi = useMemo(() => createCategoriesDataAccess(user), [user]);

	const loansQ = useQuery({
		queryKey: ["loans", user?.id],
		queryFn: () => loansApi.fetchLoans(),
		enabled: Boolean(user?.id),
	});
	const emisQ = useQuery({
		queryKey: ["emis", user?.id],
		queryFn: () => loansApi.fetchEmis(),
		enabled: Boolean(user?.id),
	});
	const contactsQ = useQuery({
		queryKey: ["contacts", user?.id],
		queryFn: () => loansApi.fetchContacts(),
		enabled: Boolean(user?.id),
	});
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
	const loanPaymentsQ = useQuery({
		queryKey: ["loanPayments", user?.id],
		queryFn: () => loansApi.fetchLoanPayments(),
		enabled: Boolean(user?.id),
	});
	const emiPaymentsQ = useQuery({
		queryKey: ["emiPayments", user?.id],
		queryFn: () => loansApi.fetchEmiPayments(),
		enabled: Boolean(user?.id),
	});

	const loans = loansQ.data?.loans ?? [];
	const emisList = emisQ.data?.emis ?? [];
	const contactsList = contactsQ.data?.contacts ?? [];
	const accountsList = accountsQ.data?.accounts ?? [];
	const categoriesList = categoriesQ.data?.categories ?? [];
	const categoryNameMap = useMemo(
		() => new Map<string, string>(categoriesList.map((c) => [c.id, c.name])),
		[categoriesList],
	);
	const allLoanPayments = loanPaymentsQ.data?.payments ?? [];
	const allEmiPayments = emiPaymentsQ.data?.payments ?? [];

	const contactNameMap = useMemo(
		() => new Map<string, string>(contactsList.map((c) => [c.id, c.name])),
		[contactsList],
	);
	const accountNameMap = useMemo(
		() => new Map<string, string>(accountsList.map((a) => [a.id, a.name])),
		[accountsList],
	);
	const paymentsByLoan = useMemo(() => {
		const m = new Map<string, LoanPayment[]>();
		for (const p of allLoanPayments) {
			const arr = m.get(p.loanId) ?? [];
			arr.push(p);
			m.set(p.loanId, arr);
		}
		return m;
	}, [allLoanPayments]);
	const paymentsByEmi = useMemo(() => {
		const m = new Map<string, EmiPayment[]>();
		for (const p of allEmiPayments) {
			const arr = m.get(p.emiId) ?? [];
			arr.push(p);
			m.set(p.emiId, arr);
		}
		return m;
	}, [allEmiPayments]);

	// Contact form
	const [cName, setCName] = useState("");
	const [cPhone, setCPhone] = useState("");
	const [cNotes, setCNotes] = useState("");

	// Loan form
	const [lType, setLType] = useState<"given" | "taken">("taken");
	const [lContact, setLContact] = useState("");
	const [lAccount, setLAccount] = useState("");
	const [lCategory, setLCategory] = useState("");
	const [lAmount, setLAmount] = useState("");
	const [lRate, setLRate] = useState("");
	const [lStart, setLStart] = useState("");
	const [lEnd, setLEnd] = useState("");
	const [lNotes, setLNotes] = useState("");

	// EMI form
	const [eName, setEName] = useState("");
	const [eDisbursementAcct, setEDisbursementAcct] = useState("");
	const [eCategory, setECategory] = useState("");
	const [ePrincipal, setEPrincipal] = useState("");
	const [eRate, setERate] = useState("");
	const [eMonthly, setEMonthly] = useState("");
	const [eStart, setEStart] = useState("");
	const [eEnd, setEEnd] = useState("");
	const [eLender, setELender] = useState("");

	// Payment form
	const [payLoanId, setPayLoanId] = useState("");
	const [payLoanAccount, setPayLoanAccount] = useState("");
	const [payLoanCategory, setPayLoanCategory] = useState("");
	const [payLoanAmount, setPayLoanAmount] = useState("");
	const [payEmiId, setPayEmiId] = useState("");
	const [payEmiAccount, setPayEmiAccount] = useState("");
	const [payEmiCategory, setPayEmiCategory] = useState("");
	const [payEmiAmount, setPayEmiAmount] = useState("");

	const invalidateLoans = () => {
		qc.invalidateQueries({ queryKey: ["loans", user?.id] });
		qc.invalidateQueries({ queryKey: ["loanPayments", user?.id] });
		qc.invalidateQueries({ queryKey: ["accounts", user?.id] });
	};
	const invalidateEmis = () => {
		qc.invalidateQueries({ queryKey: ["emis", user?.id] });
		qc.invalidateQueries({ queryKey: ["emiPayments", user?.id] });
	};

	const createContactM = useMutation({
		mutationFn: () =>
			loansApi.createContact({ name: cName, phone: cPhone, notes: cNotes }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["contacts", user?.id] });
			setCName("");
			setCPhone("");
			setCNotes("");
		},
	});
	const deleteContactM = useMutation({
		mutationFn: (id: string) => loansApi.deleteContact(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts", user?.id] }),
	});

	const createLoanM = useMutation({
		mutationFn: () =>
			loansApi.createLoan({
				loanType: lType,
				contactId: lContact || null,
				accountId: lAccount,
				categoryId: lCategory || null,
				principalAmount: Number(lAmount),
				interestRate: lRate ? Number(lRate) : null,
				startedAt: lStart || undefined,
				expectedEndDate: lEnd || null,
				notes: lNotes,
			}),
		onSuccess: () => {
			invalidateLoans();
			setLAmount("");
			setLRate("");
			setLStart("");
			setLEnd("");
			setLNotes("");
			setLContact("");
			setLAccount("");
			setLCategory("");
		},
	});
	const deleteLoanM = useMutation({
		mutationFn: (id: string) => loansApi.deleteLoan(id),
		onSuccess: invalidateLoans,
	});
	const deleteLoanPayM = useMutation({
		mutationFn: (id: string) => loansApi.deleteLoanPayment(id),
		onSuccess: invalidateLoans,
	});

	const createEmiM = useMutation({
		mutationFn: () =>
			loansApi.createEmi({
				name: eName,
				principal: Number(ePrincipal),
				interestRate: Number(eRate),
				monthlyAmount: Number(eMonthly),
				startDate: eStart,
				endDate: eEnd,
				nextDueDate: eStart,
				lenderName: eLender,
				disbursementAccountId: eDisbursementAcct || undefined,
				categoryId: eCategory || null,
			}),
		onSuccess: () => {
			invalidateEmis();
			setEName("");
			setEPrincipal("");
			setERate("");
			setEMonthly("");
			setEStart("");
			setEEnd("");
			setELender("");
			setEDisbursementAcct("");
			setECategory("");
		},
	});
	const deleteEmiM = useMutation({
		mutationFn: (id: string) => loansApi.deleteEmi(id),
		onSuccess: invalidateEmis,
	});
	const deleteEmiPayM = useMutation({
		mutationFn: (id: string) => loansApi.deleteEmiPayment(id),
		onSuccess: invalidateEmis,
	});

	const payLoanM = useMutation({
		mutationFn: () =>
			loansApi.createLoanPayment({
				loanId: payLoanId,
				accountId: payLoanAccount,
				categoryId: payLoanCategory || null,
				amount: Number(payLoanAmount),
			}),
		onSuccess: () => {
			invalidateLoans();
			setPayLoanAmount("");
			setPayLoanCategory("");
		},
	});
	const payEmiM = useMutation({
		mutationFn: () =>
			loansApi.createEmiPayment({
				emiId: payEmiId,
				accountId: payEmiAccount,
				categoryId: payEmiCategory || null,
				amount: Number(payEmiAmount),
			}),
		onSuccess: () => {
			invalidateEmis();
			setPayEmiAmount("");
			setPayEmiCategory("");
		},
	});

	const totalDebt = loans
		.filter((l) => l.loan.loanType === "taken" && l.loan.status === "active")
		.reduce((s: number, l) => s + Number(l.loan.remainingAmount), 0);
	const totalOwed = loans
		.filter((l) => l.loan.loanType === "given" && l.loan.status === "active")
		.reduce((s: number, l) => s + Number(l.loan.remainingAmount), 0);
	const totalEmiMonthly = emisList
		.filter((e) => e.status === "active")
		.reduce((s: number, e) => s + Number(e.monthlyAmount), 0);

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-semibold">Loans & EMIs</h1>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Outstanding Debt</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold text-red-600">
						{fmt(totalDebt)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Money Lent Out</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold text-green-600">
						{fmt(totalOwed)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Monthly EMI Burden</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						{fmt(totalEmiMonthly)}
					</CardContent>
				</Card>
			</div>

			<Tabs defaultValue="loans">
				<TabsList>
					<TabsTrigger value="contacts">Contacts</TabsTrigger>
					<TabsTrigger value="loans">Loans</TabsTrigger>
					<TabsTrigger value="emis">EMIs</TabsTrigger>
					<TabsTrigger value="payments">Record Payment</TabsTrigger>
				</TabsList>

				{/* Contacts tab */}
				<TabsContent value="contacts" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Add Contact</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label>Name</Label>
									<Input
										value={cName}
										onChange={(e) => setCName(e.target.value)}
										placeholder="Person or org name"
									/>
								</div>
								<div>
									<Label>Phone</Label>
									<Input
										value={cPhone}
										onChange={(e) => setCPhone(e.target.value)}
										placeholder="+91 98765 43210"
									/>
								</div>
							</div>
							<div>
								<Label>Notes</Label>
								<Input
									value={cNotes}
									onChange={(e) => setCNotes(e.target.value)}
								/>
							</div>
							<Button
								onClick={() => createContactM.mutate()}
								disabled={!cName || createContactM.isPending}
							>
								{createContactM.isPending ? "Adding…" : "Add Contact"}
							</Button>
						</CardContent>
					</Card>

					<div className="space-y-2">
						{contactsQ.isLoading ? (
							<p className="text-muted-foreground">Loading…</p>
						) : contactsList.length === 0 ? (
							<p className="text-muted-foreground">No contacts yet.</p>
						) : (
							contactsList.map((c) => (
								<Card key={c.id}>
									<CardContent className="pt-4 flex items-center justify-between">
										<div>
											<p className="font-medium">{c.name}</p>
											{c.phone && (
												<p className="text-sm text-muted-foreground">
													{c.phone}
												</p>
											)}
											{c.notes && (
												<p className="text-xs text-muted-foreground">
													{c.notes}
												</p>
											)}
										</div>
										<Button
											variant="ghost"
											size="sm"
											className="text-destructive"
											onClick={() => deleteContactM.mutate(c.id)}
										>
											Delete
										</Button>
									</CardContent>
								</Card>
							))
						)}
					</div>
				</TabsContent>

				{/* Loans tab */}
				<TabsContent value="loans" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Add Loan</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label>Type</Label>
									<Select
										value={lType}
										onValueChange={(v) =>
											setLType((v ?? lType) as "given" | "taken")
										}
									>
										<SelectTrigger>
											<span
												data-slot="select-value"
												className="flex flex-1 text-left text-sm"
											>
												{lType === "taken"
													? "Taken (I borrowed)"
													: "Given (I lent)"}
											</span>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="taken">Taken (I borrowed)</SelectItem>
											<SelectItem value="given">Given (I lent)</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Contact</Label>
									<Select
										value={lContact}
										onValueChange={(v) => setLContact(v ?? "")}
									>
										<SelectTrigger>
											{lContact ? (
												<span
													data-slot="select-value"
													className="flex flex-1 text-left text-sm"
												>
													{contactNameMap.get(lContact) ?? lContact}
												</span>
											) : (
												<SelectValue placeholder="Select contact (optional)" />
											)}
										</SelectTrigger>
										<SelectContent>
											{contactsList.map((c) => (
												<SelectItem key={c.id} value={c.id}>
													{c.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<div>
								<Label>Source account (required)</Label>
								<Select
									value={lAccount}
									onValueChange={(v) => setLAccount(v ?? "")}
								>
									<SelectTrigger>
										{lAccount ? (
											<span
												data-slot="select-value"
												className="flex flex-1 text-left text-sm"
											>
												{accountNameMap.get(lAccount) ?? lAccount}
											</span>
										) : (
											<SelectValue placeholder="Select bank account" />
										)}
									</SelectTrigger>
									<SelectContent>
										{accountsList
											.filter((a) =>
												["bank", "cash", "wallet", "salary"].includes(
													a.accountType,
												),
											)
											.map((a) => (
												<SelectItem key={a.id} value={a.id}>
													{a.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground mt-1">
									Money moves through this account. A paired{" "}
									{lType === "given" ? "asset" : "liability"} account is created
									automatically.
								</p>
							</div>
							<div>
								<Label>Category (optional)</Label>
								<Select
									value={lCategory}
									onValueChange={(v) => setLCategory(v ?? "")}
								>
									<SelectTrigger>
										{lCategory ? (
											<span
												data-slot="select-value"
												className="flex flex-1 text-left text-sm"
											>
												{categoryNameMap.get(lCategory) ?? lCategory}
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
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label>Amount</Label>
									<Input
										type="number"
										step="0.01"
										value={lAmount}
										onChange={(e) => setLAmount(e.target.value)}
										placeholder="0.00"
									/>
								</div>
								<div>
									<Label>Interest Rate %</Label>
									<Input
										type="number"
										step="0.01"
										value={lRate}
										onChange={(e) => setLRate(e.target.value)}
										placeholder="Optional"
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label>Start Date</Label>
									<DatePicker value={lStart} onChange={setLStart} />
								</div>
								<div>
									<Label>Expected End Date</Label>
									<DatePicker value={lEnd} onChange={setLEnd} />
								</div>
							</div>
							<div>
								<Label>Notes</Label>
								<Input
									value={lNotes}
									onChange={(e) => setLNotes(e.target.value)}
								/>
							</div>
							<Button
								onClick={() => createLoanM.mutate()}
								disabled={!lAmount || !lAccount || createLoanM.isPending}
							>
								{createLoanM.isPending ? "Adding…" : "Add Loan"}
							</Button>
						</CardContent>
					</Card>

					<div className="space-y-3">
						{loansQ.isLoading ? (
							<p className="text-muted-foreground">Loading…</p>
						) : loans.length === 0 ? (
							<p className="text-muted-foreground">No loans yet.</p>
						) : (
							loans.map((row) => {
								const l = row.loan;
								const paid =
									Number(l.principalAmount) - Number(l.remainingAmount);
								const pct =
									Number(l.principalAmount) > 0
										? Math.round((paid / Number(l.principalAmount)) * 100)
										: 0;
								const loanPayments = paymentsByLoan.get(l.id) ?? [];

								return (
									<Card key={l.id}>
										<CardContent className="pt-4 space-y-3">
											<div className="flex items-center justify-between flex-wrap gap-2">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="font-medium">
														{l.loanType === "given"
															? "Lent to"
															: "Borrowed from"}{" "}
														<span className="text-foreground">
															{row.contactName ?? "Unknown"}
														</span>
													</span>
													{l.accountId && (
														<span className="text-xs text-muted-foreground">
															via{" "}
															{accountNameMap.get(l.accountId) ?? l.accountId}
														</span>
													)}
													<Badge
														className={`text-xs ${STATUS_COLORS[l.status] ?? ""}`}
													>
														{l.status}
													</Badge>
												</div>
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive"
													onClick={() => deleteLoanM.mutate(l.id)}
												>
													Delete
												</Button>
											</div>

											<div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
												<span>
													Principal:{" "}
													<span className="text-foreground font-medium">
														{fmt(l.principalAmount)}
													</span>
												</span>
												<span>
													Remaining:{" "}
													<span className="text-foreground font-medium">
														{fmt(l.remainingAmount)}
													</span>
												</span>
												{l.interestRate && (
													<span>Interest: {l.interestRate}%</span>
												)}
											</div>
											<div className="w-full bg-muted rounded-full h-2">
												<div
													className="bg-primary h-2 rounded-full"
													style={{ width: `${pct}%` }}
												/>
											</div>
											<p className="text-xs text-muted-foreground">
												{pct}% repaid
											</p>

											{loanPayments.length > 0 && (
												<div>
													<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
														Payments ({loanPayments.length})
													</p>
													<div className="space-y-1">
														{loanPayments.map((p) => (
															<div
																key={p.id}
																className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-1.5"
															>
																<span>
																	{new Date(p.paidAt).toLocaleDateString()}
																</span>
																<span className="font-medium">
																	{fmt(p.amount)}
																</span>
																<Button
																	size="sm"
																	variant="ghost"
																	className="text-destructive h-6 px-2 text-xs"
																	onClick={() => deleteLoanPayM.mutate(p.id)}
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
					</div>
				</TabsContent>

				{/* EMIs tab */}
				<TabsContent value="emis" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Add EMI</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label>Name</Label>
									<Input
										value={eName}
										onChange={(e) => setEName(e.target.value)}
										placeholder="Home loan EMI"
									/>
								</div>
								<div>
									<Label>Lender</Label>
									<Input
										value={eLender}
										onChange={(e) => setELender(e.target.value)}
										placeholder="Bank name"
									/>
								</div>
							</div>
							<div className="grid grid-cols-3 gap-3">
								<div>
									<Label>Principal</Label>
									<Input
										type="number"
										step="0.01"
										value={ePrincipal}
										onChange={(e) => setEPrincipal(e.target.value)}
									/>
								</div>
								<div>
									<Label>Interest Rate %</Label>
									<Input
										type="number"
										step="0.01"
										value={eRate}
										onChange={(e) => setERate(e.target.value)}
									/>
								</div>
								<div>
									<Label>Monthly EMI</Label>
									<Input
										type="number"
										step="0.01"
										value={eMonthly}
										onChange={(e) => setEMonthly(e.target.value)}
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label>Start Date</Label>
									<DatePicker value={eStart} onChange={setEStart} />
								</div>
								<div>
									<Label>End Date</Label>
									<DatePicker value={eEnd} onChange={setEEnd} />
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label>Disbursement account (optional)</Label>
									<Select
										value={eDisbursementAcct}
										onValueChange={(v) => setEDisbursementAcct(v ?? "")}
									>
										<SelectTrigger>
											{eDisbursementAcct ? (
												<span
													data-slot="select-value"
													className="flex flex-1 text-left text-sm"
												>
													{accountNameMap.get(eDisbursementAcct) ??
														eDisbursementAcct}
												</span>
											) : (
												<SelectValue placeholder="None — already-running EMI" />
											)}
										</SelectTrigger>
										<SelectContent>
											{accountsList
												.filter((a) =>
													["bank", "cash", "wallet", "salary"].includes(
														a.accountType,
													),
												)
												.map((a) => (
													<SelectItem key={a.id} value={a.id}>
														{a.name}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground mt-1">
										Pick a bank to also credit the principal as a new
										disbursement.
									</p>
								</div>
								<div>
									<Label>Category (optional)</Label>
									<Select
										value={eCategory}
										onValueChange={(v) => setECategory(v ?? "")}
									>
										<SelectTrigger>
											{eCategory ? (
												<span
													data-slot="select-value"
													className="flex flex-1 text-left text-sm"
												>
													{categoryNameMap.get(eCategory) ?? eCategory}
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
							<Button
								onClick={() => createEmiM.mutate()}
								disabled={
									!eName ||
									!ePrincipal ||
									!eMonthly ||
									!eStart ||
									!eEnd ||
									createEmiM.isPending
								}
							>
								{createEmiM.isPending ? "Adding…" : "Add EMI"}
							</Button>
						</CardContent>
					</Card>

					<div className="space-y-3">
						{emisQ.isLoading ? (
							<p className="text-muted-foreground">Loading…</p>
						) : emisList.length === 0 ? (
							<p className="text-muted-foreground">No EMIs yet.</p>
						) : (
							emisList.map((e) => {
								const due = new Date(e.nextDueDate);
								const isOverdue = due < new Date() && e.status === "active";
								const emiPayments = paymentsByEmi.get(e.id) ?? [];

								return (
									<Card key={e.id}>
										<CardContent className="pt-4 space-y-3">
											<div className="flex items-center justify-between flex-wrap gap-2">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="font-medium">{e.name}</span>
													{e.lenderName && (
														<span className="text-muted-foreground text-sm">
															— {e.lenderName}
														</span>
													)}
													<Badge
														className={`text-xs ${STATUS_COLORS[e.status] ?? ""}`}
													>
														{e.status}
													</Badge>
													{isOverdue && (
														<Badge className="text-xs bg-red-100 text-red-800">
															Overdue
														</Badge>
													)}
												</div>
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive"
													onClick={() => deleteEmiM.mutate(e.id)}
												>
													Delete
												</Button>
											</div>

											<div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
												<span>
													Monthly:{" "}
													<span className="text-foreground font-medium">
														{fmt(e.monthlyAmount)}
													</span>
												</span>
												<span>Interest: {e.interestRate}%</span>
												<span>
													Next due:{" "}
													<span
														className={
															isOverdue
																? "text-red-600 font-medium"
																: "text-foreground"
														}
													>
														{due.toLocaleDateString()}
													</span>
												</span>
												<span>
													Ends: {new Date(e.endDate).toLocaleDateString()}
												</span>
											</div>

											{emiPayments.length > 0 && (
												<div>
													<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
														Payments ({emiPayments.length})
													</p>
													<div className="space-y-1">
														{emiPayments.map((p) => (
															<div
																key={p.id}
																className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-1.5"
															>
																<span>
																	{new Date(p.paidAt).toLocaleDateString()}
																</span>
																<span className="font-medium">
																	{fmt(p.amount)}
																</span>
																<Button
																	size="sm"
																	variant="ghost"
																	className="text-destructive h-6 px-2 text-xs"
																	onClick={() => deleteEmiPayM.mutate(p.id)}
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
					</div>
				</TabsContent>

				{/* Record Payment tab */}
				<TabsContent value="payments" className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<Card>
							<CardHeader>
								<CardTitle>Record Loan Payment</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<Label>Loan</Label>
								<Select
									value={payLoanId}
									onValueChange={(v) => setPayLoanId(v ?? "")}
								>
									<SelectTrigger>
										{payLoanId ? (
											<span
												data-slot="select-value"
												className="flex flex-1 text-left text-sm"
											>
												{(() => {
													const l = loans.find(
														(r) => r.loan.id === payLoanId,
													)?.loan;
													if (!l) return payLoanId;
													const contact = l.contactId
														? contactNameMap.get(l.contactId)
														: null;
													return `${l.loanType === "taken" ? "Borrowed" : "Lent"} ${contact ? `— ${contact}` : ""} (${fmt(l.remainingAmount)} left)`;
												})()}
											</span>
										) : (
											<SelectValue placeholder="Select loan" />
										)}
									</SelectTrigger>
									<SelectContent>
										{loans
											.filter((l) => l.loan.status === "active")
											.map((l) => {
												const contact = l.loan.contactId
													? contactNameMap.get(l.loan.contactId)
													: null;
												return (
													<SelectItem key={l.loan.id} value={l.loan.id}>
														{l.loan.loanType === "taken" ? "Borrowed" : "Lent"}
														{contact ? ` — ${contact}` : ""} (
														{fmt(l.loan.remainingAmount)} left)
													</SelectItem>
												);
											})}
									</SelectContent>
								</Select>
								<Label>Bank account</Label>
								<Select
									value={payLoanAccount}
									onValueChange={(v) => setPayLoanAccount(v ?? "")}
								>
									<SelectTrigger>
										{payLoanAccount ? (
											<span
												data-slot="select-value"
												className="flex flex-1 text-left text-sm"
											>
												{accountNameMap.get(payLoanAccount) ?? payLoanAccount}
											</span>
										) : (
											<SelectValue placeholder="Select bank account" />
										)}
									</SelectTrigger>
									<SelectContent>
										{accountsList
											.filter((a) =>
												["bank", "cash", "wallet", "salary"].includes(
													a.accountType,
												),
											)
											.map((a) => (
												<SelectItem key={a.id} value={a.id}>
													{a.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
								<Label>Category (optional)</Label>
								<Select
									value={payLoanCategory}
									onValueChange={(v) => setPayLoanCategory(v ?? "")}
								>
									<SelectTrigger>
										{payLoanCategory ? (
											<span
												data-slot="select-value"
												className="flex flex-1 text-left text-sm"
											>
												{categoryNameMap.get(payLoanCategory) ??
													payLoanCategory}
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
								<Label>Amount</Label>
								<Input
									type="number"
									step="0.01"
									value={payLoanAmount}
									onChange={(e) => setPayLoanAmount(e.target.value)}
								/>
								<Button
									onClick={() => payLoanM.mutate()}
									disabled={
										!payLoanId ||
										!payLoanAccount ||
										!payLoanAmount ||
										payLoanM.isPending
									}
								>
									{payLoanM.isPending ? "Recording…" : "Record Payment"}
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Record EMI Payment</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<Label>EMI</Label>
								<Select
									value={payEmiId}
									onValueChange={(v) => setPayEmiId(v ?? "")}
								>
									<SelectTrigger>
										{payEmiId ? (
											<span
												data-slot="select-value"
												className="flex flex-1 text-left text-sm"
											>
												{emisList.find((e) => e.id === payEmiId)?.name ??
													payEmiId}
											</span>
										) : (
											<SelectValue placeholder="Select EMI" />
										)}
									</SelectTrigger>
									<SelectContent>
										{emisList
											.filter((e) => e.status === "active")
											.map((e) => (
												<SelectItem key={e.id} value={e.id}>
													{e.name} — {fmt(e.monthlyAmount)}/mo
												</SelectItem>
											))}
									</SelectContent>
								</Select>
								<Label>Bank account</Label>
								<Select
									value={payEmiAccount}
									onValueChange={(v) => setPayEmiAccount(v ?? "")}
								>
									<SelectTrigger>
										{payEmiAccount ? (
											<span
												data-slot="select-value"
												className="flex flex-1 text-left text-sm"
											>
												{accountNameMap.get(payEmiAccount) ?? payEmiAccount}
											</span>
										) : (
											<SelectValue placeholder="Select bank account" />
										)}
									</SelectTrigger>
									<SelectContent>
										{accountsList
											.filter((a) =>
												["bank", "cash", "wallet", "salary"].includes(
													a.accountType,
												),
											)
											.map((a) => (
												<SelectItem key={a.id} value={a.id}>
													{a.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
								<Label>Category (optional)</Label>
								<Select
									value={payEmiCategory}
									onValueChange={(v) => setPayEmiCategory(v ?? "")}
								>
									<SelectTrigger>
										{payEmiCategory ? (
											<span
												data-slot="select-value"
												className="flex flex-1 text-left text-sm"
											>
												{categoryNameMap.get(payEmiCategory) ?? payEmiCategory}
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
								<Label>Amount</Label>
								<Input
									type="number"
									step="0.01"
									value={payEmiAmount}
									onChange={(e) => setPayEmiAmount(e.target.value)}
								/>
								<Button
									onClick={() => payEmiM.mutate()}
									disabled={
										!payEmiId ||
										!payEmiAccount ||
										!payEmiAmount ||
										payEmiM.isPending
									}
								>
									{payEmiM.isPending ? "Recording…" : "Record Payment"}
								</Button>
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
