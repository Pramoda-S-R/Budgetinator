import { Dialog, DialogContent } from "#/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";

const AccountDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Tabs defaultValue={"account"} orientation="vertical">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="account"></TabsContent>
          <TabsContent value="security"></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AccountDialog;
