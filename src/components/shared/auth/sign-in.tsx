import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "#/auth";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignIn({ redirectTo }: { redirectTo?: string }) {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	const safeRedirectTo = redirectTo?.startsWith("/")
		? redirectTo
		: "/dashboard";

	const signIn = async (event: React.SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsPending(true);
		setError(null);

		const result = await authClient.signIn.email({ email, password });

		if (result.error) {
			setError(result.error.message ?? "Unable to sign in. Please try again.");
			setIsPending(false);
			return;
		}

		await navigate({ to: safeRedirectTo });
	};

	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>Login to your account</CardTitle>
				<CardDescription>
					Enter your email below to login to your account
				</CardDescription>
				<CardAction>
					<Button
						nativeButton={false}
						variant="link"
						render={(props) => (
							<Link
								{...props}
								to="/auth/sign-up"
								search={redirectTo ? { redirectTo } : {}}
							>
								Sign Up
							</Link>
						)}
					/>
				</CardAction>
			</CardHeader>
			<CardContent>
				<form onSubmit={signIn}>
					<div className="flex flex-col gap-6">
						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="m@example.com"
								required
								value={email}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<div className="flex items-center">
								<Label htmlFor="password">Password</Label>
								<Link
									to={"/dashboard"}
									className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
								>
									Forgot your password?
								</Link>
							</div>
							<Input
								id="password"
								type="password"
								required
								value={password}
								onChange={(event) => setPassword(event.target.value)}
							/>
						</div>

						{error ? (
							<p className="text-sm text-destructive" role="alert">
								{error}
							</p>
						) : null}

						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending ? "Signing in..." : "Login"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
