import React, { useState } from "react";
import {
  Button, Input, Label, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui";
import { AlertCircle, Send } from "lucide-react";
import { logError } from "@/lib/logger";

export interface TicketFormData {
  subject: string;
  description: string;
  priority: "low" | "normal" | "high" | "urgent";
  category?: string;
}

interface TicketFormProps {
  onSubmit: (data: TicketFormData) => Promise<void>;
  loading?: boolean;
  className?: string;
}

const PRIORITIES = [
  { value: "low", label: "Low", color: "text-gray-600" },
  { value: "normal", label: "Normal", color: "text-blue-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "urgent", label: "Urgent", color: "text-red-600" },
];

const CATEGORIES = [
  { value: "account", label: "Account & Profile" },
  { value: "transactions", label: "Deposits & Withdrawals" },
  { value: "statements", label: "Statements & Reports" },
  { value: "technical", label: "Technical Issues" },
  { value: "general", label: "General Inquiry" },
  { value: "other", label: "Other" },
];

export default function TicketForm({ onSubmit, loading = false, className = "" }: TicketFormProps) {
  const [formData, setFormData] = useState<TicketFormData>({
    subject: "",
    description: "",
    priority: "normal",
    category: "general",
  });
  const [errors, setErrors] = useState<Partial<TicketFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<TicketFormData> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit(formData);
      // Reset form on successful submission
      setFormData({
        subject: "",
        description: "",
        priority: "normal",
        category: "general",
      });
      setErrors({});
    } catch (error) {
      logError("TicketForm.submit", error);
    }
  };

  const handleInputChange = (field: keyof TicketFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Send className="h-5 w-5" />
          <span>Create Support Ticket</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => handleInputChange("priority", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <span className={priority.color}>{priority.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              type="text"
              placeholder="Brief description of your issue"
              value={formData.subject}
              onChange={(e) => handleInputChange("subject", e.target.value)}
              className={errors.subject ? "border-red-500" : ""}
            />
            {errors.subject && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.subject}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please provide detailed information about your issue..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={6}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.description}
              </p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              {formData.description.length}/1000 characters
            </p>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-white"></div>
                Creating Ticket...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create Ticket
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
