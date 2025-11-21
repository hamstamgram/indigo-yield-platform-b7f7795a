/**
 * Multi-Email Input Component
 * Reusable component for managing multiple email addresses with primary designation
 *
 * Features:
 * - Add/remove multiple emails
 * - Designate one email as primary
 * - Email validation
 * - Visual indicators for primary email
 * - Prevent duplicate emails
 * - Maximum email limit
 */

import React, { useState } from "react";
import { Plus, X, Star, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface InvestorEmailAddress {
  email: string;
  isPrimary: boolean;
  isValid?: boolean;
}

export interface MultiEmailInputProps {
  emails: InvestorEmailAddress[];
  onChange: (emails: InvestorEmailAddress[]) => void;
  maxEmails?: number;
  placeholder?: string;
  disabled?: boolean;
  showValidation?: boolean;
}

// =====================================================
// EMAIL VALIDATION
// =====================================================

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// =====================================================
// MULTI-EMAIL INPUT COMPONENT
// =====================================================

export function MultiEmailInput({
  emails,
  onChange,
  maxEmails = 5,
  placeholder = "Enter email address",
  disabled = false,
  showValidation = true,
}: MultiEmailInputProps) {
  const [newEmail, setNewEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * Add new email to the list
   */
  const handleAddEmail = () => {
    // Clear previous validation error
    setValidationError(null);

    // Trim and lowercase
    const trimmedEmail = newEmail.trim().toLowerCase();

    // Validation: Empty check
    if (!trimmedEmail) {
      setValidationError("Email address cannot be empty");
      return;
    }

    // Validation: Format check
    if (!validateEmail(trimmedEmail)) {
      setValidationError("Invalid email format");
      return;
    }

    // Validation: Duplicate check
    if (emails.some((e) => e.email === trimmedEmail)) {
      setValidationError("Email already added");
      return;
    }

    // Validation: Max emails check
    if (emails.length >= maxEmails) {
      setValidationError(`Maximum ${maxEmails} emails allowed`);
      return;
    }

    // Add new email
    const newEmailObj: InvestorEmailAddress = {
      email: trimmedEmail,
      isPrimary: emails.length === 0, // First email is primary by default
      isValid: true,
    };

    onChange([...emails, newEmailObj]);
    setNewEmail(""); // Clear input
  };

  /**
   * Remove email from the list
   */
  const handleRemoveEmail = (index: number) => {
    const emailToRemove = emails[index];

    // Prevent removing if it's the only email
    if (emails.length === 1) {
      setValidationError("At least one email is required");
      return;
    }

    // Remove email
    const updatedEmails = emails.filter((_, i) => i !== index);

    // If we removed the primary email, set the first remaining as primary
    if (emailToRemove.isPrimary && updatedEmails.length > 0) {
      updatedEmails[0].isPrimary = true;
    }

    onChange(updatedEmails);
    setValidationError(null);
  };

  /**
   * Set an email as primary
   */
  const handleSetPrimary = (index: number) => {
    const updatedEmails = emails.map((email, i) => ({
      ...email,
      isPrimary: i === index,
    }));
    onChange(updatedEmails);
  };

  /**
   * Handle Enter key press in input
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Email Input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || emails.length >= maxEmails}
            className={validationError ? "border-red-500" : ""}
          />
        </div>
        <Button
          onClick={handleAddEmail}
          disabled={disabled || emails.length >= maxEmails || !newEmail.trim()}
          variant="secondary"
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Validation Error */}
      {showValidation && validationError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Email List */}
      {emails.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Addresses ({emails.length}/{maxEmails})
          </div>

          <div className="space-y-2">
            {emails.map((emailObj, index) => (
              <div
                key={index}
                className={`
                  flex items-center gap-2 p-3 rounded-lg border transition-all
                  ${
                    emailObj.isPrimary
                      ? "bg-indigo-50 border-indigo-300 shadow-sm"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }
                  ${disabled ? "opacity-50" : ""}
                `}
              >
                {/* Email Icon */}
                <Mail
                  className={`h-4 w-4 shrink-0 ${emailObj.isPrimary ? "text-indigo-600" : "text-gray-400"}`}
                />

                {/* Email Address */}
                <span
                  className={`flex-1 text-sm ${emailObj.isPrimary ? "font-medium text-indigo-900" : "text-gray-700"}`}
                >
                  {emailObj.email}
                </span>

                {/* Primary Badge */}
                {emailObj.isPrimary && (
                  <Badge variant="default" className="bg-indigo-600 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Primary
                  </Badge>
                )}

                {/* Set Primary Button */}
                {!emailObj.isPrimary && (
                  <Button
                    onClick={() => handleSetPrimary(index)}
                    disabled={disabled}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-indigo-600"
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Set as Primary
                  </Button>
                )}

                {/* Remove Button */}
                <Button
                  onClick={() => handleRemoveEmail(index)}
                  disabled={disabled || emails.length === 1}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-red-600 hover:bg-red-50 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      {emails.length === 0 && (
        <p className="text-sm text-gray-500">
          Add email addresses for this investor. The first email will be set as primary.
        </p>
      )}

      {emails.length > 0 && emails.length < maxEmails && (
        <p className="text-sm text-gray-500">
          You can add up to {maxEmails - emails.length} more email
          {maxEmails - emails.length !== 1 ? "s" : ""}.
        </p>
      )}

      {emails.length >= maxEmails && (
        <p className="text-sm text-orange-600">Maximum email limit reached ({maxEmails} emails).</p>
      )}
    </div>
  );
}

// =====================================================
// EXAMPLE USAGE (FOR DOCUMENTATION)
// =====================================================

/*
import { MultiEmailInput, InvestorEmailAddress } from '@/components/admin/MultiEmailInput';

function MyComponent() {
  const [emails, setEmails] = useState<InvestorEmailAddress[]>([
    { email: 'john@example.com', isPrimary: true, isValid: true },
  ]);

  return (
    <MultiEmailInput
      emails={emails}
      onChange={setEmails}
      maxEmails={5}
      placeholder="Enter email address"
    />
  );
}
*/
