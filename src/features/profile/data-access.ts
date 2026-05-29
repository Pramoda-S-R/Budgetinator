import { z } from "zod";
import { createApiClient, unwrapApiResult } from "#/features/shared/api-client";
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

const userProfileSchema = z.object({
	id: z.string(),
	email: z.string(),
	name: z.string(),
	currencyCode: z.string(),
	timezone: z.string(),
});

const profileEnvelopeSchema = z.object({
	profile: userProfileSchema,
});

export function createProfileDataAccess(user?: User) {
	const client = createApiClient(user);

	return {
		async fetchProfile() {
			const result = await client.get("/api/profile", profileEnvelopeSchema);
			return unwrapApiResult(result);
		},
		async updateProfile(input: UpdateProfileInput) {
			const result = await client.patch(
				"/api/profile",
				input,
				profileEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
	};
}

export async function fetchProfile(user?: User) {
	return createProfileDataAccess(user).fetchProfile();
}

export async function updateProfile(input: UpdateProfileInput, user?: User) {
	return createProfileDataAccess(user).updateProfile(input);
}
