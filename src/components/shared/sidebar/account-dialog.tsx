import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountView } from "@neondatabase/neon-js/auth/react/ui";

import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
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
      await queryClient.invalidateQueries({ queryKey: ["profile", currentUser?.id] });
      setError(null);
    },
    onError: () => {
      setError("Unable to save profile settings");
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

  async function onSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await profileMutation.mutateAsync();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={"account"}>
          <TabsList className="w-full">
            <TabsTrigger value="account" className="flex-1">Account</TabsTrigger>
            <TabsTrigger value="preferences" className="flex-1">Preferences</TabsTrigger>
            <TabsTrigger value="security" className="flex-1">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            <div className="rounded-md border p-3">
              <AccountView pathname="profile" />
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
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
                  <Label htmlFor="account-currency">Currency</Label>
                  <Input
                    id="account-currency"
                    value={currencyCode}
                    onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())}
                    placeholder="USD"
                    minLength={3}
                    maxLength={3}
                    required
                  />
                </div>
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

              {profileQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading profile...</p> : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="rounded-md border p-3">
              <h3 className="mb-2 text-sm font-semibold">Change Password</h3>
              <AccountView pathname="security" />
            </div>
            <div className="rounded-md border p-3">
              <h3 className="mb-2 text-sm font-semibold">Active Sessions</h3>
              <AccountView pathname="sessions" />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AccountDialog;
