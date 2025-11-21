import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

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
    <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="text-xl">Notification Settings</CardTitle>
        <CardDescription>Configure how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Email Notifications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Receive portfolio updates by email
            </p>
          </div>
          <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Security Alerts</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Get notified about account security events
            </p>
          </div>
          <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Yield Updates</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Be notified when yield rates change
            </p>
          </div>
          <Switch checked={yieldUpdates} onCheckedChange={setYieldUpdates} />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Marketing Communications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Receive news, updates, and promotions
            </p>
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
