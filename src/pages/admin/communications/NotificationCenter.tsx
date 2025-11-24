import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Bell, Send, Clock, Users, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// Mock data type
type Notification = {
  id: string;
  title: string;
  message: string;
  target_audience: "all" | "investors" | "specific";
  scheduled_at: string | null;
  status: "sent" | "scheduled" | "draft";
  sent_at: string | null;
  recipient_count: number;
};

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Monthly Yield Update",
    message: "Your monthly yield report for October is now available.",
    target_audience: "all",
    scheduled_at: null,
    status: "sent",
    sent_at: "2025-10-01T09:00:00Z",
    recipient_count: 142,
  },
  {
    id: "2",
    title: "Platform Maintenance",
    message: "Scheduled maintenance this Sunday at 2 AM UTC.",
    target_audience: "all",
    scheduled_at: "2025-11-25T10:00:00Z",
    status: "scheduled",
    sent_at: null,
    recipient_count: 150,
  },
];

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"all" | "investors" | "specific">("all");
  const [scheduleTime, setScheduleTime] = useState("");
  const { toast } = useToast();

  const handleSend = () => {
    if (!title || !message) {
      toast({
        title: "Validation Error",
        description: "Please provide both a title and message.",
        variant: "destructive",
      });
      return;
    }

    const newNotification: Notification = {
      id: Date.now().toString(),
      title,
      message,
      target_audience: audience,
      scheduled_at: scheduleTime || null,
      status: scheduleTime ? "scheduled" : "sent",
      sent_at: scheduleTime ? null : new Date().toISOString(),
      recipient_count: 0, // Would calculate based on audience
    };

    setNotifications([newNotification, ...notifications]);
    toast({
      title: scheduleTime ? "Notification Scheduled" : "Notification Sent",
      description: `Successfully ${scheduleTime ? "scheduled" : "sent"} notification to ${audience === "all" ? "all users" : "selected audience"}.`,
    });

    // Reset form
    setTitle("");
    setMessage("");
    setScheduleTime("");
  };

  const columns = [
    { header: "Title", accessorKey: "title" as keyof Notification, className: "font-medium" },
    {
      header: "Audience",
      accessorKey: "target_audience" as keyof Notification,
      cell: (item: Notification) => <Badge variant="outline">{item.target_audience}</Badge>,
    },
    {
      header: "Status",
      accessorKey: "status" as keyof Notification,
      cell: (item: Notification) => (
        <Badge
          variant={
            item.status === "sent"
              ? "default"
              : item.status === "scheduled"
                ? "secondary"
                : "outline"
          }
          className={item.status === "sent" ? "bg-green-600" : ""}
        >
          {item.status === "sent" ? (
            <CheckCircle className="w-3 h-3 mr-1" />
          ) : item.status === "scheduled" ? (
            <Clock className="w-3 h-3 mr-1" />
          ) : null}
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      ),
    },
    {
      header: "Date",
      accessorKey: "sent_at" as keyof Notification,
      cell: (item: Notification) => {
        const date = item.sent_at || item.scheduled_at;
        return date ? new Date(date).toLocaleString() : "-";
      },
    },
    { header: "Recipients", accessorKey: "recipient_count" as keyof Notification },
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
                <option value="specific">Specific Users (Tag)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule (Optional)</Label>
              <Input
                id="schedule"
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave blank to send immediately.</p>
            </div>

            <Button
              onClick={handleSend}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4"
            >
              {scheduleTime ? "Schedule Notification" : "Send Now"}
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
            <ResponsiveTable
              data={notifications}
              columns={columns}
              keyExtractor={(item) => item.id}
              emptyMessage="No notifications sent yet."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
