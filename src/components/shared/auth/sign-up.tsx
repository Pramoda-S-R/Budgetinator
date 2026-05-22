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

export function SignUp({ redirectTo }: { redirectTo?: string }) {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	const safeRedirectTo = redirectTo?.startsWith("/")
		? redirectTo
		: "/dashboard";

	const signUp = async (event: React.SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsPending(true);
		setError(null);

		const result = await authClient.signUp.email({ email, password, name });

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
				<CardTitle>Create your account</CardTitle>
				<CardDescription>
					Enter your details below to create your account
				</CardDescription>
				<CardAction>
					<Button
						nativeButton={false}
						variant="link"
						render={(props) => (
							<Link
								{...props}
								to="/auth/sign-in"
								search={redirectTo ? { redirectTo } : {}}
							>
								Sign In
							</Link>
						)}
					/>
				</CardAction>
			</CardHeader>
			<CardContent>
				<form onSubmit={signUp}>
					<div className="flex flex-col gap-6">
						<div className="grid gap-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								type="text"
								placeholder="John Doe"
								required
								disabled={isPending}
								value={name}
								onChange={(event) => setName(event.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="m@example.com"
								required
								disabled={isPending}
								value={email}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								required
								disabled={isPending}
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
							{isPending ? "Creating account..." : "Create account"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
