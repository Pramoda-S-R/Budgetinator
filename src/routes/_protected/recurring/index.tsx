import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useCurrentUser from "#/hooks/use-current-user";
import {
  fetchRecurringRules,
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
} from "#/features/recurring/data-access";
import { fetchCategories } from "#/features/categories/data-access";
import { fetchAccounts } from "#/features/accounts/data-access";
import { Card, CardHeader, CardTitle, CardContent } from "#/components/ui/card";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Badge } from "#/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "#/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "#/components/ui/popover";
import { Calendar } from "#/components/ui/calendar";

export const Route = createFileRoute("/_protected/recurring/")({
  component: RecurringPage,
});

const FREQ_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const TX_TYPE_LABEL: Record<string, string> = {
  expense: "Expense",
  income: "Income",
};

function fmt(val: string | number) {
  return Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function RecurringPage() {
  const user = useCurrentUser();
  const qc = useQueryClient();

  const rulesQ = useQuery({
    queryKey: ["recurringRules", user?.id],
    queryFn: () => fetchRecurringRules(user),
    enabled: Boolean(user?.id),
  });
  const categoriesQ = useQuery({
    queryKey: ["categories", user?.id],
    queryFn: () => fetchCategories(user),
    enabled: Boolean(user?.id),
  });
  const accountsQ = useQuery({
    queryKey: ["accounts", user?.id],
    queryFn: () => fetchAccounts(user),
    enabled: Boolean(user?.id),
  });

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [freq, setFreq] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [nextRun, setNextRun] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");

  const createM = useMutation({
    mutationFn: () =>
      createRecurringRule(
        {
          description: desc,
          amount: Number(amount),
          transactionType: txType,
          frequency: freq,
          nextRunDate: nextRun,
          categoryId: categoryId || null,
          accountId: accountId || null,
        },
        user,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurringRules", user?.id] });
      setDesc(""); setAmount(""); setNextRun(""); setCategoryId(""); setAccountId("");
    },
  });

  const toggleM = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateRecurringRule(id, { isActive }, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurringRules", user?.id] }),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteRecurringRule(id, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurringRules", user?.id] }),
  });

  const rules = rulesQ.data?.rules ?? [];
  const categories = categoriesQ.data?.categories ?? [];
  const accounts = accountsQ.data?.accounts ?? [];

  const activeCount = rules.filter((r: any) => r.isActive).length;
  const monthlyEstimate = rules
    .filter((r: any) => r.isActive && r.transactionType === "expense" && r.frequency === "monthly")
    .reduce((s: number, r: any) => s + Number(r.amount), 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Recurring Rules</h1>
      <p className="text-muted-foreground">
        Define recurring income and expense patterns. These are used as forecasting inputs — they don't auto-create transactions.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Active Rules</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{activeCount}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Est. Monthly Expenses (recurring)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{fmt(monthlyEstimate)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Add Recurring Rule</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Description</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Netflix subscription" />
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={txType} onValueChange={(v) => setTxType(v as "income" | "expense")}>
                <SelectTrigger>
                  <span data-slot="select-value" className="flex flex-1 text-left text-sm">{TX_TYPE_LABEL[txType]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={freq} onValueChange={(v) => setFreq(v as typeof freq)}>
                <SelectTrigger>
                  <span data-slot="select-value" className="flex flex-1 text-left text-sm">{FREQ_LABEL[freq]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Next Run Date</Label>
              <Popover>
                <PopoverTrigger
                  nativeButton={false}
                  render={<Input readOnly value={nextRun} placeholder="Pick date" className="cursor-pointer" />}
                />
                <PopoverContent sideOffset={4} align="start">
                  <Calendar
                    mode="single"
                    selected={nextRun ? new Date(`${nextRun}T00:00:00`) : undefined}
                    onSelect={(d) => d && setNextRun(d.toISOString().slice(0, 10))}
                    showOutsideDays={false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category (optional)</Label>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
                <SelectTrigger>
                  {categoryId ? (
                    <span data-slot="select-value" className="flex flex-1 text-left text-sm">
                      {categories.find((c: any) => c.id === categoryId)?.name ?? categoryId}
                    </span>
                  ) : (
                    <SelectValue placeholder="None" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Account (optional)</Label>
              <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
                <SelectTrigger>
                  {accountId ? (
                    <span data-slot="select-value" className="flex flex-1 text-left text-sm">
                      {accounts.find((a: any) => a.id === accountId)?.name ?? accountId}
                    </span>
                  ) : (
                    <SelectValue placeholder="None" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={() => createM.mutate()}
            disabled={!desc || !amount || !nextRun || createM.isPending}
          >
            {createM.isPending ? "Adding…" : "Add Rule"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {rulesQ.isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : rules.length === 0 ? (
          <p className="text-muted-foreground">No recurring rules yet.</p>
        ) : (
          rules.map((rule: any) => {
            const nextDate = new Date(rule.nextRunDate);
            const isDue = nextDate <= new Date();
            return (
              <Card key={rule.id} className={rule.isActive ? "" : "opacity-60"}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{rule.description}</span>
                      <Badge
                        className={`ml-2 text-xs ${rule.transactionType === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {rule.transactionType}
                      </Badge>
                      <Badge className="ml-1 text-xs bg-muted text-muted-foreground">
                        {FREQ_LABEL[rule.frequency]}
                      </Badge>
                      {!rule.isActive && (
                        <Badge className="ml-1 text-xs bg-gray-100 text-gray-500">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleM.mutate({ id: rule.id, isActive: !rule.isActive })}
                      >
                        {rule.isActive ? "Pause" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteM.mutate(rule.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 flex gap-4">
                    <span className="font-medium text-foreground">{fmt(rule.amount)}</span>
                    <span>
                      Next:{" "}
                      <span className={isDue && rule.isActive ? "text-amber-600 font-medium" : ""}>
                        {nextDate.toLocaleDateString()}
                        {isDue && rule.isActive ? " (due)" : ""}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
