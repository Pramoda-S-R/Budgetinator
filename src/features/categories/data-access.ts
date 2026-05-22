import type { User } from "#/hooks/use-current-user";

export type CategoryGroup = {
	id: string;
	userId: string;
	name: string;
	type: string;
	icon: string;
	color: string;
	sortOrder: number;
	isArchived: boolean;
	createdAt: string;
};

export type Category = {
	id: string;
	userId: string;
	groupId: string;
	name: string;
	icon: string;
	color: string;
	transactionType: string;
	sortOrder: number;
	isArchived: boolean;
	createdAt: string;
	groupName?: string;
};

type CreateCategoryGroupInput = {
	name: string;
	type: string;
	icon?: string;
	color?: string;
	sortOrder?: number;
};

type UpdateCategoryGroupInput = {
	name?: string;
	type?: string;
	icon?: string;
	color?: string;
	sortOrder?: number;
	isArchived?: boolean;
};

type CreateCategoryInput = {
	groupId: string;
	name: string;
	icon?: string;
	color?: string;
	transactionType: string;
	sortOrder?: number;
};

type UpdateCategoryInput = {
	groupId?: string;
	name?: string;
	icon?: string;
	color?: string;
	transactionType?: string;
	sortOrder?: number;
	isArchived?: boolean;
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

export async function fetchCategoryGroups(
	user?: User,
	includeArchived = false,
) {
	const search = includeArchived ? "?includeArchived=true" : "";

	return request<{ categoryGroups: CategoryGroup[] }>(
		`/api/category-groups${search}`,
		{
			headers: createAuthHeaders(user),
		},
	);
}

export async function createCategoryGroup(
	input: CreateCategoryGroupInput,
	user?: User,
) {
	return request<{ categoryGroup: CategoryGroup }>("/api/category-groups", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...createAuthHeaders(user),
		},
		body: JSON.stringify(input),
	});
}

export async function updateCategoryGroup(
	groupId: string,
	input: UpdateCategoryGroupInput,
	user?: User,
) {
	return request<{ categoryGroup: CategoryGroup }>(
		`/api/category-groups/${groupId}`,
		{
			method: "PATCH",
			headers: {
				"content-type": "application/json",
				...createAuthHeaders(user),
			},
			body: JSON.stringify(input),
		},
	);
}

export async function deleteCategoryGroup(groupId: string, user?: User) {
	return request<{ success: boolean }>(`/api/category-groups/${groupId}`, {
		method: "DELETE",
		headers: createAuthHeaders(user),
	});
}

export async function fetchCategories(user?: User, includeArchived = false) {
	const search = includeArchived ? "?includeArchived=true" : "";

	return request<{ categories: Category[] }>(`/api/categories${search}`, {
		headers: createAuthHeaders(user),
	});
}

export async function createCategory(input: CreateCategoryInput, user?: User) {
	return request<{ category: Category }>("/api/categories", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...createAuthHeaders(user),
		},
		body: JSON.stringify(input),
	});
}

export async function updateCategory(
	categoryId: string,
	input: UpdateCategoryInput,
	user?: User,
) {
	return request<{ category: Category }>(`/api/categories/${categoryId}`, {
		method: "PATCH",
		headers: {
			"content-type": "application/json",
			...createAuthHeaders(user),
		},
		body: JSON.stringify(input),
	});
}

export async function deleteCategory(categoryId: string, user?: User) {
	return request<{ success: boolean }>(`/api/categories/${categoryId}`, {
		method: "DELETE",
		headers: createAuthHeaders(user),
	});
}
