import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Phone, Mail, CheckCircle } from "lucide-react";
import { useUserEmail } from "@/hooks/data/useProfileSettings";
import type { OnboardingData } from "@/types/domains";

interface ProfileSetupStepProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onComplete: () => void;
}

const ProfileSetupStep: React.FC<ProfileSetupStepProps> = ({ data, onUpdate, onComplete }) => {
  const [formData, setFormData] = useState({
    first_name: data.profile.first_name || "",
    last_name: data.profile.last_name || "",
    phone: data.profile.phone || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);

  const { data: userEmail } = useUserEmail();

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    // First name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    } else if (formData.first_name.trim().length < 2) {
      newErrors.first_name = "First name must be at least 2 characters";
    }

    // Last name validation
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    } else if (formData.last_name.trim().length < 2) {
      newErrors.last_name = "Last name must be at least 2 characters";
    }

    // Phone validation (optional but should be valid if provided)
    if (formData.phone && !/^[+]?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    const valid = Object.keys(newErrors).length === 0;
    setIsValid(valid);

    // Update parent with current data and completion status
    if (valid) {
      onUpdate({
        profile: {
          ...data.profile,
          ...formData,
        },
      });
      onComplete();
    }
  }, [formData, data.profile, onUpdate, onComplete]);

  useEffect(() => {
    validateForm();
  }, [formData, validateForm]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "");

    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length >= 10) {
      const match = digits.match(/^(\d{3})(\d{3})(\d{4})/);
      if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
      }
    }

    return value;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange("phone", formatted);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <Alert>
        <User className="h-4 w-4" />
        <AlertDescription>
          Complete your profile to personalize your Indigo Yield experience. This information helps
          us provide better service and secure your account.
        </AlertDescription>
      </Alert>

      {/* Form */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Email (Read-only) */}
        <div className="md:col-span-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={userEmail || ""}
            readOnly
            className="bg-gray-50 dark:bg-gray-800"
          />
          <p className="text-sm text-muted-foreground mt-1">
            This is your login email and cannot be changed here.
          </p>
        </div>

        {/* First Name */}
        <div>
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            type="text"
            placeholder="Enter your first name"
            value={formData.first_name}
            onChange={(e) => handleInputChange("first_name", e.target.value)}
            className={errors.first_name ? "border-red-500" : ""}
          />
          {errors.first_name && <p className="text-sm text-red-600 mt-1">{errors.first_name}</p>}
        </div>

        {/* Last Name */}
        <div>
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            type="text"
            placeholder="Enter your last name"
            value={formData.last_name}
            onChange={(e) => handleInputChange("last_name", e.target.value)}
            className={errors.last_name ? "border-red-500" : ""}
          />
          {errors.last_name && <p className="text-sm text-red-600 mt-1">{errors.last_name}</p>}
        </div>

        {/* Phone Number */}
        <div className="md:col-span-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Number (Optional)
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={formData.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className={errors.phone ? "border-red-500" : ""}
          />
          {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
          <p className="text-sm text-muted-foreground mt-1">
            We may use this to contact you about important account updates.
          </p>
        </div>
      </div>

      {/* Privacy Notice */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mt-0.5">
              <CheckCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Privacy & Security
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Your personal information is encrypted and securely stored. We never share your data
                with third parties without your consent. You can update this information anytime in
                your account settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Status */}
      {isValid && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Profile information complete! You can proceed to the next step.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ProfileSetupStep;
