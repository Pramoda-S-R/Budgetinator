import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar as CalendarIcon,
  ListChecks,
  Circle,
  Home,
  Receipt,
  Car,
  Heart,
  Briefcase,
  Sparkles,
  Landmark,
  Tag,
  ShoppingCart,
  Utensils,
  Fuel,
  Tv,
  GraduationCap,
  Wallet,
  TrendingUp,
  type LucideIcon,
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
import useCurrentUser from "#/hooks/use-current-user";
import { Popover, PopoverTrigger, PopoverContent } from "#/components/ui/popover";
import { Calendar } from "#/components/ui/calendar";
import {
  fetchCategoryGroups,
  type CategoryGroup,
} from "#/features/categories/data-access";
import {
  fetchBudgetPresets,
  createBudgetPreset,
  fetchMonthlyBudget,
  applyPresetToMonth,
  type BudgetPreset,
  type MonthlyBudget,
  type MonthlyBudgetAllocation,
} from "#/features/budgets/data-access";

type AllocationRow = {
  id: string;
  groupId?: string;
  amount: string;
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

function IconGlyph({ iconName }: { iconName: string }) {
  const Icon = ICON_COMPONENTS[iconName] ?? Circle;
  return <Icon className="size-4" />;
}

export const Route = createFileRoute("/_protected/budgets/")({
  component: BudgetsPage,
});

function BudgetsPage() {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();

  const [presetName, setPresetName] = useState("");
  const [presetDesc, setPresetDesc] = useState("");
  const [rows, setRows] = useState<AllocationRow[]>([createRow()]);
  const [presetError, setPresetError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}`;
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [expectedIncome, setExpectedIncome] = useState("0");

  const groupsQuery = useQuery({
    queryKey: ["category-groups", currentUser?.id],
    queryFn: () => fetchCategoryGroups(currentUser),
    enabled: Boolean(currentUser?.id),
  });
  const presetsQuery = useQuery({
    queryKey: ["budget-presets", currentUser?.id],
    queryFn: () => fetchBudgetPresets(currentUser),
    enabled: Boolean(currentUser?.id),
  });
  const monthlyQuery = useQuery({
    queryKey: ["monthly-budget", currentUser?.id, monthKey],
    queryFn: () => fetchMonthlyBudget(currentUser, monthKey),
    enabled: Boolean(currentUser?.id),
  });

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createBudgetPreset>[0]) =>
      createBudgetPreset(input, currentUser),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["budget-presets", currentUser?.id],
      });
      setPresetName("");
      setPresetDesc("");
      setRows([createRow()]);
      setPresetError(null);
    },
  });

  const applyMutation = useMutation({
    mutationFn: (input: Parameters<typeof applyPresetToMonth>[0]) =>
      applyPresetToMonth(input, currentUser),
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
    () => allocations?.reduce((sum, a) => sum + Number(a.allocatedAmount), 0),
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
    const [yr, mo] = monthKey.split("-").map(Number);
    applyMutation.mutate({
      presetId: selectedPreset,
      year: yr,
      month: mo,
      expectedIncome: Number(expectedIncome),
    });
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <CalendarIcon className="size-4 inline-block mr-2" />
            Create Budget Preset
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreatePreset} className="space-y-4">
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
                    onValueChange={(v) => updateRow(row.id, { groupId: v })}
                  >
                    <SelectTrigger>
                      {(() => {
                        const g = row.groupId ? groups.find((gg) => gg.id === row.groupId) : null;
                        return g ? (
                          <span data-slot="select-value" className="flex flex-1 items-center gap-1.5 text-left text-sm">
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
              <Button type="submit" disabled={createMutation.isLoading}>
                Save Preset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <CalendarIcon className="size-4 inline-block mr-2" />
            Apply Budget Preset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Popover>
                <PopoverTrigger
                  render={<Input id="month" readOnly value={monthKey} />}
                />
                <PopoverContent sideOffset={4} align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    showOutsideDays={false}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preset">Preset</Label>
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger>
                  {(() => {
                    const p = presets.find((pp) => pp.id === selectedPreset);
                    return p ? (
                      <span data-slot="select-value" className="flex flex-1 text-left text-sm">
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
              <Label htmlFor="income">Expected Income</Label>
              <Input
                id="income"
                type="number"
                step="0.01"
                value={expectedIncome}
                onChange={(e) => setExpectedIncome(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleApply} disabled={applyMutation.isLoading}>
            Apply Preset
          </Button>
          {applyMutation.isError && (
            <p className="text-sm text-destructive">Unable to apply preset</p>
          )}
        </CardContent>
      </Card>

      {monthly && allocations && (
        <Card>
          <CardHeader>
            <CardTitle>
              <ListChecks className="size-4 inline-block mr-2" />
              Monthly Budget {monthKey}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Expected Income: {Number(monthly.expectedIncome).toFixed(2)}</p>
            <p>Total Allocated: {(totalAllocated ?? 0).toFixed(2)}</p>
            <p>
              Remaining:{" "}
              {(Number(monthly.expectedIncome) - (totalAllocated ?? 0)).toFixed(
                2,
              )}
            </p>
            <div className="space-y-2">
              {allocations.map((a) => (
                <div key={a.id} className="flex justify-between">
                  <span>{a.categoryName || a.categoryGroupName}</span>
                  <span>{Number(a.allocatedAmount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
