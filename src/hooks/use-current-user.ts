import { authClient } from "#/auth";

export type User = {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	email: string;
	emailVerified: boolean;
	name: string;
	image?: string | null;
	banned: boolean | null;
	role?: string | null;
	banReason?: string | null;
	banExpires?: Date | null;
};

export default function useCurrentUser() {
	const session = authClient.useSession();
	return session.data?.user as User | undefined;
}
