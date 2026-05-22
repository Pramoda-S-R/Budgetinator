import { SignedIn, SignedOut } from "@neondatabase/neon-js/auth/react/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BarChart3,
	PiggyBank,
	Target,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<div className="relative min-h-screen overflow-hidden bg-[#0b1120] text-[#e8eeff]">
			<div
				className="pointer-events-none absolute inset-0 opacity-10"
				style={{
					backgroundImage:
						"repeating-linear-gradient(0deg, #6a79ff 0, #6a79ff 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, #6a79ff 0, #6a79ff 1px, transparent 1px, transparent 20px)",
					backgroundSize: "20px 20px",
				}}
			/>

			<main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
				<section className="mx-auto w-full max-w-4xl space-y-10 text-center">
					<div className="inline-flex items-center gap-2 border-2 border-[#4f64c4] px-4 py-2">
						<span className="h-2 w-2 animate-pulse bg-[#63e89d]" />
						<span className="text-xs uppercase tracking-widest text-[#9dafec]">
							Track every rupee, build your future
						</span>
					</div>

					<div className="space-y-4">
						<div className="mx-auto flex w-fit items-center gap-3 border-2 border-[#5e73d6] bg-[#101a33] px-4 py-2">
							<PiggyBank className="size-5 text-[#6a79ff]" />
							<span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#d7e1ff]">
								Budgetinator
							</span>
						</div>
						<h1 className="text-4xl font-semibold tracking-wide text-[#eef2ff] sm:text-5xl">
							Master Your Money Today
						</h1>
						<p className="mx-auto max-w-2xl text-sm leading-relaxed text-[#9dafec] sm:text-base">
							Track expenses, manage budgets, monitor investments, and stay
							aligned with your financial goals from one focused dashboard.
						</p>
					</div>

					<div className="flex flex-col min-h-11 items-center justify-center gap-4 sm:flex-row">
						<SignedIn>
							<Button
								size="lg"
								className="gap-2"
								nativeButton={false}
								render={(props) => (
									<Link {...props} to={"/dashboard"}>
										Go to Dashboard
										<ArrowRight className="size-4" />
									</Link>
								)}
							/>
						</SignedIn>

						<SignedOut>
							<Button
								size="lg"
								className="gap-2"
								onClick={() => {
									window.location.href = "/auth/sign-up";
								}}
							>
								Get Started
								<ArrowRight className="size-4" />
							</Button>

							<Button
								size="lg"
								variant="outline"
								onClick={() => {
									window.location.href = "/auth/sign-in";
								}}
							>
								Sign In
							</Button>
						</SignedOut>
					</div>

					<div className="grid grid-cols-2 gap-3 pt-6 md:grid-cols-4">
						{[
							{
								icon: Wallet,
								label: "Expenses",
								value: "Track spending",
								color: "border-[#ff6d85] text-[#ff6d85]",
							},
							{
								icon: Target,
								label: "Budgets",
								value: "Stay on track",
								color: "border-[#ffbf4d] text-[#ffbf4d]",
							},
							{
								icon: TrendingUp,
								label: "Investments",
								value: "Grow wealth",
								color: "border-[#67e89e] text-[#67e89e]",
							},
							{
								icon: BarChart3,
								label: "Analytics",
								value: "Data insights",
								color: "border-[#55d8ff] text-[#55d8ff]",
							},
						].map((feature) => (
							<div
								key={feature.label}
								className={`space-y-2 border-2 bg-[#0f1730] p-4 ${feature.color}`}
							>
								<feature.icon className="mx-auto size-6" />
								<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7e1ff]">
									{feature.label}
								</p>
								<p className="text-xs text-[#9dafec]">{feature.value}</p>
							</div>
						))}
					</div>
				</section>
			</main>
		</div>
	);
}
