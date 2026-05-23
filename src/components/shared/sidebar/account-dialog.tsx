import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { authClient } from "#/auth";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Separator } from "#/components/ui/separator";
import { fetchProfile, updateProfile } from "#/features/profile/data-access";
import useCurrentUser from "#/hooks/use-current-user";

const AccountDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [securityError, setSecurityError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile", currentUser?.id],
    queryFn: () => fetchProfile(currentUser),
    enabled: open && Boolean(currentUser?.id),
  });

  const profileMutation = useMutation({
    mutationFn: () =>
      updateProfile(
        {
          name,
          currencyCode,
          timezone,
        },
        currentUser,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["profile", currentUser?.id],
      });
      setError(null);
    },
    onError: () => {
      setError("Unable to save profile settings");
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ["sessions", currentUser?.id],
    enabled: open && Boolean(currentUser?.id),
    queryFn: async () => {
      const result = await authClient.listSessions();
      if (result.error) {
        throw new Error(result.error.message ?? "Unable to fetch sessions");
      }

      return result.data ?? [];
    },
  });

  const currentSessionQuery = useQuery({
    queryKey: ["current-session", currentUser?.id],
    enabled: open && Boolean(currentUser?.id),
    queryFn: async () => {
      const result = await authClient.getSession();
      if (result.error) {
        throw new Error(
          result.error.message ?? "Unable to fetch current session",
        );
      }

      return result.data?.session?.token ?? null;
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Unable to change password");
      }

      return result;
    },
    onSuccess: async () => {
      setCurrentPassword("");
      setNewPassword("");
      setSecurityError(null);
      await queryClient.invalidateQueries({
        queryKey: ["sessions", currentUser?.id],
      });
    },
    onError: () => {
      setSecurityError("Unable to change password");
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (token: string) => {
      const result = await authClient.revokeSession({ token });
      if (result.error) {
        throw new Error(result.error.message ?? "Unable to revoke session");
      }

      return result;
    },
    onSuccess: async () => {
      setSecurityError(null);
      await queryClient.invalidateQueries({
        queryKey: ["sessions", currentUser?.id],
      });
    },
    onError: () => {
      setSecurityError("Unable to revoke session");
    },
  });

  useEffect(() => {
    if (!profileQuery.data?.profile) {
      return;
    }

    setName(profileQuery.data.profile.name);
    setCurrencyCode(profileQuery.data.profile.currencyCode);
    setTimezone(profileQuery.data.profile.timezone);
  }, [profileQuery.data?.profile]);

  async function onSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await profileMutation.mutateAsync();
  }

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await changePasswordMutation.mutateAsync();
  }

  const sessions = useMemo(() => {
    return (
      (sessionsQuery.data as Array<{
        token?: string;
        userAgent?: string | null;
        ipAddress?: string | null;
        createdAt?: string | Date | null;
        expiresAt?: string | Date | null;
      }>) ?? []
    );
  }, [sessionsQuery.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={"account"}>
          <TabsList className="w-full">
            <TabsTrigger value="account" className="flex-1">
              Account
            </TabsTrigger>
            <TabsTrigger value="security" className="flex-1">
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            <form onSubmit={onSaveProfile} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="account-name">Display Name</Label>
                  <Input
                    id="account-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-email">Email</Label>
                  <Input
                    id="account-email"
                    value={
                      profileQuery.data?.profile.email ??
                      currentUser?.email ??
                      ""
                    }
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-currency">Currency</Label>
                  <Input
                    id="account-currency"
                    value={currencyCode}
                    onChange={(event) =>
                      setCurrencyCode(event.target.value.toUpperCase())
                    }
                    placeholder="USD"
                    minLength={3}
                    maxLength={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-timezone">Timezone</Label>
                  <Input
                    id="account-timezone"
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    placeholder="Asia/Kolkata"
                    required
                  />
                </div>
              </div>

              {profileQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading profile...
                </p>
              ) : null}
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="space-y-2">
              <h3 className="mb-2 text-sm font-semibold">Change Password</h3>
              <form onSubmit={onChangePassword} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending
                    ? "Updating..."
                    : "Change Password"}
                </Button>
              </form>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              <h3 className="mb-2 text-sm font-semibold">Active Sessions</h3>
              {sessionsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading sessions...
                </p>
              ) : null}
              {sessionsQuery.isError ? (
                <p className="text-sm text-destructive">
                  Unable to load sessions
                </p>
              ) : null}
              {securityError ? (
                <p className="mb-2 text-sm text-destructive">{securityError}</p>
              ) : null}

              <ScrollArea className="h-64">
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={
                        session.token ??
                        `${session.userAgent}-${session.createdAt}`
                      }
                      className="flex flex-col gap-2 px-1 py-2 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">
                          {session.userAgent ?? "Unknown device"}
                        </p>
                        <p className="text-muted-foreground">
                          IP: {session.ipAddress ?? "Unknown"}
                        </p>
                        <p className="text-muted-foreground">
                          Created:{" "}
                          {session.createdAt
                            ? new Date(session.createdAt).toLocaleString()
                            : "Unknown"}
                        </p>
                      </div>
                      {session.token &&
                      session.token === currentSessionQuery.data ? (
                        <Button
                          variant="destructive"
                          onClick={() => {
                            window.location.href = "/auth/sign-out";
                          }}
                        >
                          Sign Out
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (session.token) {
                              revokeSessionMutation.mutate(session.token);
                            }
                          }}
                          disabled={
                            !session.token || revokeSessionMutation.isPending
                          }
                        >
                          Revoke Session
                        </Button>
                      )}
                    </div>
                  ))}

                  {!sessionsQuery.isLoading && sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active sessions found.
                    </p>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AccountDialog;
