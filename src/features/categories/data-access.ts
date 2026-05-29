import { z } from "zod";
import { createApiClient, unwrapApiResult } from "#/features/shared/api-client";
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

const categoryGroupSchema = z.object({
	id: z.string(),
	userId: z.string(),
	name: z.string(),
	type: z.string(),
	icon: z.string(),
	color: z.string(),
	sortOrder: z.number(),
	isArchived: z.boolean(),
	createdAt: z.string(),
});

const categorySchema = z.object({
	id: z.string(),
	userId: z.string(),
	groupId: z.string(),
	name: z.string(),
	icon: z.string(),
	color: z.string(),
	transactionType: z.string(),
	sortOrder: z.number(),
	isArchived: z.boolean(),
	createdAt: z.string(),
	groupName: z.string().optional(),
});

const categoryGroupsEnvelopeSchema = z.object({
	categoryGroups: z.array(categoryGroupSchema),
});

const categoryGroupEnvelopeSchema = z.object({
	categoryGroup: categoryGroupSchema,
});

const categoriesEnvelopeSchema = z.object({
	categories: z.array(categorySchema),
});

const categoryEnvelopeSchema = z.object({
	category: categorySchema,
});

const successEnvelopeSchema = z.object({
	success: z.boolean(),
});

export function createCategoriesDataAccess(user?: User) {
	const client = createApiClient(user);

	return {
		async fetchCategoryGroups(includeArchived = false) {
			const search = includeArchived ? "?includeArchived=true" : "";
			const result = await client.get(
				`/api/category-groups${search}`,
				categoryGroupsEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async createCategoryGroup(input: CreateCategoryGroupInput) {
			const result = await client.post(
				"/api/category-groups",
				input,
				categoryGroupEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async updateCategoryGroup(
			groupId: string,
			input: UpdateCategoryGroupInput,
		) {
			const result = await client.patch(
				`/api/category-groups/${groupId}`,
				input,
				categoryGroupEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteCategoryGroup(groupId: string) {
			const result = await client.delete(
				`/api/category-groups/${groupId}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchCategories(includeArchived = false) {
			const search = includeArchived ? "?includeArchived=true" : "";
			const result = await client.get(
				`/api/categories${search}`,
				categoriesEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async createCategory(input: CreateCategoryInput) {
			const result = await client.post(
				"/api/categories",
				input,
				categoryEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async updateCategory(categoryId: string, input: UpdateCategoryInput) {
			const result = await client.patch(
				`/api/categories/${categoryId}`,
				input,
				categoryEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteCategory(categoryId: string) {
			const result = await client.delete(
				`/api/categories/${categoryId}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
	};
}

export async function fetchCategoryGroups(
	user?: User,
	includeArchived = false,
) {
	return createCategoriesDataAccess(user).fetchCategoryGroups(includeArchived);
}

export async function createCategoryGroup(
	input: CreateCategoryGroupInput,
	user?: User,
) {
	return createCategoriesDataAccess(user).createCategoryGroup(input);
}

export async function updateCategoryGroup(
	groupId: string,
	input: UpdateCategoryGroupInput,
	user?: User,
) {
	return createCategoriesDataAccess(user).updateCategoryGroup(groupId, input);
}

export async function deleteCategoryGroup(groupId: string, user?: User) {
	return createCategoriesDataAccess(user).deleteCategoryGroup(groupId);
}

export async function fetchCategories(user?: User, includeArchived = false) {
	return createCategoriesDataAccess(user).fetchCategories(includeArchived);
}

export async function createCategory(input: CreateCategoryInput, user?: User) {
	return createCategoriesDataAccess(user).createCategory(input);
}

export async function updateCategory(
	categoryId: string,
	input: UpdateCategoryInput,
	user?: User,
) {
	return createCategoriesDataAccess(user).updateCategory(categoryId, input);
}

export async function deleteCategory(categoryId: string, user?: User) {
	return createCategoriesDataAccess(user).deleteCategory(categoryId);
}
