import { createRoute } from "@tanstack/react-router";
import { useLoader } from "@tanstack/react-start";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { calculateGainLoss, calculatePortfolioAllocation } from "#/lib/investment-analytics";
import { useMatches } from "../../hooks.js";

const loader = async () => {
  const [invRes, entryRes, valRes] = await Promise.all([
    fetch("/api/investments/").then((res) => res.json()),
    fetch("/api/investment-entries/").then((res) => res.json()),
    fetch("/api/investment-valuations/").then((res) => res.json()),
  ]);
  return {
    investments: invRes.investments,
    entries: entryRes.entries,
    valuations: valRes.valuations,
  };
};

export const Route = createRoute({
  getParentRoute: () => ProtectedRoute,
  path: "/investments/",
  loader,
  component: function InvestmentsPage() {
    const { investments, entries, valuations } = useLoader<typeof loader>();
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
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
