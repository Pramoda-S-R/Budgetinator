import type { User } from "#/hooks/use-current-user";

export type UserProfile = {
	id: string;
	email: string;
	name: string;
	currencyCode: string;
	timezone: string;
};

type UpdateProfileInput = {
	name?: string;
	currencyCode?: string;
	timezone?: string;
};

function createAuthHeaders(user?: User): Record<string, string> {
	if (!user?.id) {
		return {};
	}

	return {
		"x-budgetinator-user-id": user.id,
		"x-budgetinator-user-email": user.email,
		"x-budgetinator-user-name": user.name,
	};
}

async function request<T>(url: string, init: RequestInit = {}) {
	const response = await fetch(url, init);

	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}

	return (await response.json()) as T;
}

export async function fetchProfile(user?: User) {
	return request<{ profile: UserProfile }>("/api/profile", {
		headers: createAuthHeaders(user),
	});
}

export async function updateProfile(input: UpdateProfileInput, user?: User) {
	return request<{ profile: UserProfile }>("/api/profile", {
		method: "PATCH",
		headers: {
			"content-type": "application/json",
			...createAuthHeaders(user),
		},
		body: JSON.stringify(input),
	});
}
