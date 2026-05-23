import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "#/components/ui/skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import useCurrentUser from "#/hooks/use-current-user";
import {
  fetchInvestments,
  fetchInvestmentEntries,
  fetchInvestmentValuations,
  createInvestment,
  createInvestmentEntry,
  createInvestmentValuation,
} from "#/features/investments/data-access";
import { calculateGainLoss, calculatePortfolioAllocation } from "#/lib/investment-analytics";
import { Label } from "#/components/ui/label";
import { Input } from "#/components/ui/input";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";

import { Card, CardHeader, CardTitle, CardContent } from "#/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "#/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";

export const Route = createFileRoute("/_protected/investments/")({
  component: InvestmentsPage,
});

function InvestmentsPage() {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const invQuery = useQuery({
    queryKey: ["investments", currentUser?.id],
    queryFn: () => fetchInvestments(currentUser),
    enabled: Boolean(currentUser?.id),
  });
  const entryQuery = useQuery({
    queryKey: ["investmentEntries", currentUser?.id],
    queryFn: () => fetchInvestmentEntries(currentUser),
    enabled: Boolean(currentUser?.id),
  });
  const valQuery = useQuery({
    queryKey: ["investmentValuations", currentUser?.id],
    queryFn: () => fetchInvestmentValuations(currentUser),
    enabled: Boolean(currentUser?.id),
  });

  // Form states
  const investments = invQuery.data?.investments ?? [];
  const [entryInvestmentId, setEntryInvestmentId] = useState(investments[0]?.id ?? "");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryUnits, setEntryUnits] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [valInvestmentId, setValInvestmentId] = useState(investments[0]?.id ?? "");
  const [valAmount, setValAmount] = useState("");
  const [valDate, setValDate] = useState("");

  // New investment form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const createInvestmentMutation = useMutation({
    mutationFn: (input: any) => createInvestment(input, currentUser),
    onSuccess: () => {
      invQuery.refetch();
      setNewName("");
      setNewType("");
      setNewSymbol("");
    },
  });

  // Mutations
  const createEntryMutation = useMutation({
    mutationFn: (input: any) => createInvestmentEntry(input, currentUser),
    onSuccess: () => {
      entryQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["investmentEntries", currentUser?.id] });
      setEntryAmount("");
      setEntryUnits("");
      setEntryDate("");
      setEntryNotes("");
    },
  });
  const createValuationMutation = useMutation({
    mutationFn: (input: any) => createInvestmentValuation(input, currentUser),
    onSuccess: () => {
      valQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["investmentValuations", currentUser?.id] });
      setValAmount("");
      setValDate("");
    },
  });

  const entries = entryQuery.data?.entries ?? [];
  const valuations = valQuery.data?.valuations ?? [];
  const gainLoss = calculateGainLoss(entries, valuations);
  const investmentNameMap = useMemo(
    () => new Map(investments.map((inv) => [inv.id, inv.name])),
    [investments],
  );
  const allocationWithNames = useMemo(() => {
    return calculatePortfolioAllocation(valuations).map((allocation) => ({
      ...allocation,
      investmentName:
        investmentNameMap.get(allocation.investmentId) ?? allocation.investmentId,
    }));
  }, [investmentNameMap, valuations]);

  return (
    <div className="p-6 bg-background min-h-screen">
      <h1 className="text-3xl font-semibold mb-6">Portfolio Overview</h1>
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {entryQuery.isLoading || valQuery.isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <RechartsTooltip />
                  <Pie
                    data={allocationWithNames}
                    dataKey="allocationPercent"
                    nameKey="investmentName"
                    labelLine={false}
                    label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                  >
                    {allocationWithNames.map((_, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={["#4ade80", "#60a5fa", "#facc15", "#f87171"][idx % 4]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gain / Loss</CardTitle>
          </CardHeader>
          <CardContent>
            {entryQuery.isLoading || valQuery.isLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {gainLoss.map(({ investmentId, gainLoss }) => {
                  const displayName = investmentNameMap.get(investmentId) ?? investmentId;
                  return (
                    <li
                      key={investmentId}
                      className="flex justify-between"
                      title={`Gain/Loss for ${displayName}`}
                    >
                      <span>{displayName}</span>
                      <span className={gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                        {gainLoss.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Add Investment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Label htmlFor="new-type">Type</Label>
            <Select
              value={newType}
              onValueChange={(value) => setNewType(value ?? "")}
            >
              <SelectTrigger id="new-type" className="w-full mb-1">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="etf">ETF</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="bond">Bond</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Label htmlFor="new-symbol">Ticker Symbol (optional)</Label>
            <Input
              id="new-symbol"
              placeholder="e.g. AAPL"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
            />
            <Button
              type="button"
              onClick={() =>
                createInvestmentMutation.mutate({
                  name: newName,
                  investmentType: newType,
                  symbol: newSymbol || null,
                })
              }
              disabled={createInvestmentMutation.status === "pending"}
            >
              {createInvestmentMutation.status === "pending"
                ? "Adding..."
                : "Add Investment"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* SIP Entry & Valuation Forms */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add SIP Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createEntryMutation.mutate({
                  investmentId: entryInvestmentId,
                  amountInvested: Number(entryAmount),
                  units: entryUnits ? Number(entryUnits) : undefined,
                  investedAt: entryDate ? new Date(entryDate) : undefined,
                  notes: entryNotes,
                });
              }}
              className="space-y-2"
            >
              <Label htmlFor="entry-investment">Investment</Label>
              <Select
                value={entryInvestmentId}
                onValueChange={(value) => setEntryInvestmentId(value ?? "")}
              >
                <SelectTrigger id="entry-investment" className="w-full mb-1">
                  {entryInvestmentId ? (
                    <span
                      data-slot="select-value"
                      className="flex flex-1 text-left text-sm"
                    >
                      {investmentNameMap.get(entryInvestmentId) ?? entryInvestmentId}
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
              <Label htmlFor="entry-amount">Amount</Label>
              <Input
                id="entry-amount"
                type="number"
                step="0.01"
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
              />
              <Label htmlFor="entry-units">Units</Label>
              <Input
                id="entry-units"
                type="number"
                step="0.0001"
                value={entryUnits}
                onChange={(e) => setEntryUnits(e.target.value)}
              />
              <Label htmlFor="entry-date">Date</Label>
              <Popover>
                <PopoverTrigger
                  nativeButton={false}
                  render={
                    <Input
                      id="entry-date"
                      readOnly
                      value={entryDate}
                      placeholder="Select date"
                    />
                  }
                />
                <PopoverContent sideOffset={4} align="start">
                  <Calendar
                    mode="single"
                    selected={entryDate ? new Date(`${entryDate}T00:00:00`) : undefined}
                    onSelect={(date) =>
                      date && setEntryDate(date.toISOString().slice(0, 10))
                    }
                    showOutsideDays={false}
                  />
                </PopoverContent>
              </Popover>
              <Label htmlFor="entry-notes">Notes</Label>
              <Input
                id="entry-notes"
                type="text"
                value={entryNotes}
                onChange={(e) => setEntryNotes(e.target.value)}
              />
              <Button type="submit">
                {createEntryMutation.status === "pending" ? "Adding..." : "Add Entry"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add Valuation</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createValuationMutation.mutate({
                  investmentId: valInvestmentId,
                  valuationAmount: Number(valAmount),
                  valuationDate: valDate ? new Date(valDate) : undefined,
                });
              }}
              className="space-y-2"
            >
              <Label htmlFor="val-investment">Investment</Label>
              <Select
                value={valInvestmentId}
                onValueChange={(value) => setValInvestmentId(value ?? "")}
              >
                <SelectTrigger id="val-investment" className="w-full mb-1">
                  {valInvestmentId ? (
                    <span
                      data-slot="select-value"
                      className="flex flex-1 text-left text-sm"
                    >
                      {investmentNameMap.get(valInvestmentId) ?? valInvestmentId}
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
              <Label htmlFor="val-amount">Valuation Amount</Label>
              <Input
                id="val-amount"
                type="number"
                step="0.01"
                value={valAmount}
                onChange={(e) => setValAmount(e.target.value)}
              />
              <Label htmlFor="val-date">Date</Label>
              <Popover>
                <PopoverTrigger
                  nativeButton={false}
                  render={
                    <Input
                      id="val-date"
                      readOnly
                      value={valDate}
                      placeholder="Select date"
                    />
                  }
                />
                <PopoverContent sideOffset={4} align="start">
                  <Calendar
                    mode="single"
                    selected={valDate ? new Date(`${valDate}T00:00:00`) : undefined}
                    onSelect={(date) =>
                      date && setValDate(date.toISOString().slice(0, 10))
                    }
                    showOutsideDays={false}
                  />
                </PopoverContent>
              </Popover>
              <Button type="submit">
                {createValuationMutation.status === "pending" ? "Submitting..." : "Add Valuation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
