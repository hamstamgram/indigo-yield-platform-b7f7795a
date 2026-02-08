import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Switch,
  Separator,
} from "@/components/ui";
import { useToast } from "@/hooks";

const NotificationsTab = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [yieldUpdates, setYieldUpdates] = useState(true);
  const [marketingComms, setMarketingComms] = useState(false);
  const { toast } = useToast();

  const handleSaveNotificationSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your notification preferences have been updated",
    });
  };

  return (
    <Card className="border-white/10 bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Notification Settings</CardTitle>
        <CardDescription>Configure how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Email Notifications</h3>
            <p className="text-sm text-muted-foreground">Receive portfolio updates by email</p>
          </div>
          <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Security Alerts</h3>
            <p className="text-sm text-muted-foreground">
              Get notified about account security events
            </p>
          </div>
          <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Yield Updates</h3>
            <p className="text-sm text-muted-foreground">Be notified when yield rates change</p>
          </div>
          <Switch checked={yieldUpdates} onCheckedChange={setYieldUpdates} />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Marketing Communications</h3>
            <p className="text-sm text-muted-foreground">Receive news, updates, and promotions</p>
          </div>
          <Switch checked={marketingComms} onCheckedChange={setMarketingComms} />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSaveNotificationSettings}>Save Notification Settings</Button>
      </CardFooter>
    </Card>
  );
};

export default NotificationsTab;
