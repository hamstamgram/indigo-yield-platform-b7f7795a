import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSupport } from "@/hooks/useSupport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TicketCategory, TicketPriority } from "@/types/support";
import { useToast } from "@/hooks/use-toast";

const NewTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { createTicket } = useSupport(currentUser?.id);

  const [formData, setFormData] = useState({
    subject: "",
    category: "general" as TicketCategory,
    priority: "medium" as TicketPriority,
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to create a ticket.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.subject || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      await createTicket({
        user_id: currentUser.id,
        subject: formData.subject,
        category: formData.category,
        priority: formData.priority,
        status: "open",
        description: formData.description,
      });

      toast({
        title: "Ticket Created",
        description: "Your support ticket has been submitted successfully.",
      });

      // Navigate to support page (feature not fully implemented)
      navigate("/support");
    } catch (error) {
      console.error("Error creating ticket:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate("/support")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Support
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create Support Ticket</CardTitle>
          <CardDescription>
            Fill out the form below to submit a new support request. Our team will respond as soon
            as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: TicketCategory) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account">Account Issues</SelectItem>
                    <SelectItem value="transaction">Transaction Issues</SelectItem>
                    <SelectItem value="technical">Technical Problems</SelectItem>
                    <SelectItem value="documents">Document Issues</SelectItem>
                    <SelectItem value="security">Security Concerns</SelectItem>
                    <SelectItem value="billing">Billing Questions</SelectItem>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: TicketPriority) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - General question</SelectItem>
                    <SelectItem value="medium">Medium - Need assistance</SelectItem>
                    <SelectItem value="high">High - Urgent issue</SelectItem>
                    <SelectItem value="urgent">Urgent - Critical problem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Please provide as much detail as possible about your issue..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={8}
                required
              />
              <p className="text-xs text-muted-foreground">
                Include any relevant details such as error messages, account numbers, or transaction
                IDs.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Ticket
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/support")}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Before You Submit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">To help us resolve your issue quickly:</p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Check our FAQ and Knowledge Base for quick answers</li>
            <li>Provide as much detail as possible about the issue</li>
            <li>Include any error messages or screenshots</li>
            <li>Mention steps to reproduce the problem</li>
            <li>Include relevant transaction or account IDs</li>
          </ul>
          <div className="pt-3">
            <Button variant="link" onClick={() => navigate("/support/faq")} className="px-0">
              Search FAQ →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewTicketPage;
