import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import useCurrentUser from "#/hooks/use-current-user";
import {
  fetchInvestments,
  fetchInvestmentEntries,
  fetchInvestmentValuations,
} from "#/features/investments/data-access";
import { calculateGainLoss, calculatePortfolioAllocation } from "#/lib/investment-analytics";

export const Route = createFileRoute("/_protected/investments/")({
  component: InvestmentsPage,
});

function InvestmentsPage() {
  const currentUser = useCurrentUser();
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

  const investments = invQuery.data?.investments ?? [];
  const entries = entryQuery.data?.entries ?? [];
  const valuations = valQuery.data?.valuations ?? [];
  const gainLoss = calculateGainLoss(entries, valuations);
  const allocation = calculatePortfolioAllocation(valuations);

    return (
      <div className="p-6 bg-gradient-to-br from-blue-50 to-green-50 min-h-screen">
        <h1 className="text-3xl font-semibold mb-6">Portfolio Overview</h1>
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <section className="bg-white shadow rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Portfolio Allocation</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={allocation}
                  dataKey="allocationPercent"
                  nameKey="investmentId"
                  labelLine={false}
                  label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                >
                  {allocation.map((_, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={["#4ade80", "#60a5fa", "#facc15", "#f87171"][idx % 4]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </section>
          <section className="bg-white shadow rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Gain / Loss</h2>
            <ul className="space-y-2">
              {gainLoss.map(({ investmentId, gainLoss }) => (
                <li key={investmentId} className="flex justify-between">
                  <span>{investmentId}</span>
                  <span className={gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                    {gainLoss.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    );
  },
});
