import { authClient } from "#/auth";
import { useEffect, useState } from "react";

export type User = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null | undefined;
    banned: boolean | null | undefined;
    role?: string | null | undefined;
    banReason?: string | null | undefined;
    banExpires?: Date | null | undefined;
}

export default function useCurrentUser() {
    const [user, setUser] = useState<User>()

    useEffect(()=>{
        async function getCurrentUser() {
            const session = await authClient.getSession()
            setUser(session.data?.user)
        }
        getCurrentUser()
    }, [])

    return user
}