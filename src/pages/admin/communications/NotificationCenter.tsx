import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Bell, Send, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type NotificationLog = {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: string;
  sent_at: string;
  error_message?: string;
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"all" | "investors" | "specific">("all");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Error",
        description: "Failed to load notification history.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!title || !message) {
      toast({
        title: "Validation Error",
        description: "Please provide both a title and message.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSending(true);

      // 1. Fetch Target Audience
      let targets: { email: string; full_name?: string }[] = [];

      if (audience === "all" || audience === "investors") {
        const { data: investors, error } = await supabase
          .from("profiles")
          .select("email, first_name, last_name")
          .eq("role", "investor"); // Assuming 'role' column exists on profiles based on schema analysis

        if (error) throw error;

        targets = investors
          .map((i) => ({
            email: i.email,
            full_name: `${i.first_name || ""} ${i.last_name || ""}`.trim(),
          }))
          .filter((i) => i.email); // Filter out any with missing emails
      } else {
        // For 'specific', just send to current user as test for now, or implement a picker
        // Using current user as a safe fallback for demo
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          targets = [{ email: user.email }];
        }
      }

      if (targets.length === 0) {
        toast({
          title: "No Recipients",
          description: "No users found for the selected audience.",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }

      // 2. Send Emails via Edge Function
      let sentCount = 0;
      let errorCount = 0;

      // Send in parallel (chunks of 5)
      const chunkSize = 5;
      for (let i = 0; i < targets.length; i += chunkSize) {
        const chunk = targets.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (target) => {
            const { error } = await supabase.functions.invoke("send-notification-email", {
              body: {
                to: target.email,
                subject: title,
                template: "admin_notification",
                data: {
                  message: message,
                  name: target.full_name || "Investor",
                },
              },
            });

            if (error) {
              console.error(`Failed to send to ${target.email}:`, error);
              errorCount++;
            } else {
              sentCount++;
            }
          })
        );
      }

      toast({
        title: "Batch Complete",
        description: `Sent ${sentCount} notifications. ${errorCount > 0 ? `${errorCount} failed.` : ""}`,
        variant: errorCount > 0 ? "destructive" : "default",
      });

      // Reset form and refresh list
      setTitle("");
      setMessage("");
      setScheduleTime("");
      fetchNotifications();
    } catch (error: any) {
      console.error("Error sending notifications:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send notifications.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const columns = [
    {
      header: "Subject",
      accessorKey: "subject" as keyof NotificationLog,
      className: "font-medium",
    },
    { header: "Recipient", accessorKey: "to" as keyof NotificationLog },
    {
      header: "Template",
      accessorKey: "template" as keyof NotificationLog,
      cell: (item: NotificationLog) => <Badge variant="outline">{item.template}</Badge>,
    },
    {
      header: "Status",
      accessorKey: "status" as keyof NotificationLog,
      cell: (item: NotificationLog) => (
        <Badge
          variant={item.status === "sent" ? "default" : "destructive"}
          className={item.status === "sent" ? "bg-green-600" : ""}
        >
          {item.status === "sent" ? (
            <CheckCircle className="w-3 h-3 mr-1" />
          ) : (
            <AlertCircle className="w-3 h-3 mr-1" />
          )}
          {item.status}
        </Badge>
      ),
    },
    {
      header: "Sent At",
      accessorKey: "sent_at" as keyof NotificationLog,
      cell: (item: NotificationLog) => new Date(item.sent_at).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
            Notification Center
          </h1>
          <p className="text-muted-foreground">
            Manage and send push notifications to web and mobile app users.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Card */}
        <Card className="lg:col-span-1 border-t-4 border-t-indigo-600 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <Send className="w-5 h-5" />
              Compose Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Notification Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message here..."
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience</Label>
              <select
                id="audience"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={audience}
                onChange={(e) => setAudience(e.target.value as any)}
              >
                <option value="all">All Users</option>
                <option value="investors">Active Investors Only</option>
                <option value="specific">Specific Users (Debug: Yourself)</option>
              </select>
            </div>

            <Button
              onClick={handleSend}
              disabled={isSending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* History List */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                <p className="mt-2 text-muted-foreground">Loading history...</p>
              </div>
            ) : (
              <ResponsiveTable
                data={notifications}
                columns={columns}
                keyExtractor={(item) => item.id}
                emptyMessage="No notifications sent yet."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
