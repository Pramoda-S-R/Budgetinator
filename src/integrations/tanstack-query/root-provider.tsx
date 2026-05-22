import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

export function getContext() {
	const queryClient = new QueryClient();

	return {
		queryClient,
	};
}

export default function TanstackQueryProvider({
	queryClient,
	children,
}: {
	queryClient: QueryClient;
	children: ReactNode;
}) {
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
