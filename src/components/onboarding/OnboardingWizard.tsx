import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, ArrowLeft, User, FileCheck, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { OnboardingData, OnboardingStep, FundConfiguration } from '@/types/phase3Types';
import ProfileSetupStep from './steps/ProfileSetupStep';
import DocumentsStep from './steps/DocumentsStep';
import FundSelectionStep from './steps/FundSelectionStep';

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Profile Setup',
    description: 'Complete your investor profile information',
    completed: false,
  },
  {
    id: 2,
    title: 'Document Review',
    description: 'Review and acknowledge fund terms and KYC requirements',
    completed: false,
  },
  {
    id: 3,
    title: 'Fund Selection',
    description: 'Choose your preferred yield-generating assets',
    completed: false,
  },
];

const OnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    profile: {},
    documents_acknowledged: false,
    selected_funds: [],
    step: 1,
  });
  const [steps, setSteps] = useState<OnboardingStep[]>(ONBOARDING_STEPS);
  const [availableFunds, setAvailableFunds] = useState<FundConfiguration[]>([]);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load existing onboarding progress
  useEffect(() => {
    loadOnboardingProgress();
    loadAvailableFunds();
  }, []);

  const loadOnboardingProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, status')
        .eq('id', user.id)
        .single();

      if (profile) {
        // If profile is complete and status is Active, redirect to dashboard
        if (profile.first_name && profile.last_name && profile.status === 'Active') {
          navigate('/dashboard');
          return;
        }

        // Load existing profile data
        setOnboardingData(prev => ({
          ...prev,
          profile: {
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            phone: profile.phone || '',
          }
        }));

        // Update step completion based on existing data
        const updatedSteps = [...steps];
        if (profile.first_name && profile.last_name) {
          updatedSteps[0].completed = true;
        }
        setSteps(updatedSteps);
      }
    } catch (error) {
      console.error('Error loading onboarding progress:', error);
    }
  };

  const loadAvailableFunds = async () => {
    try {
      const { data: funds } = await supabase
        .from('fund_configurations')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (funds) {
        setAvailableFunds(funds);
      }
    } catch (error) {
      console.error('Error loading funds:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available funds',
        variant: 'destructive',
      });
    }
  };

  const updateOnboardingData = (updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }));
  };

  const markStepCompleted = (stepId: number) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));
  };

  const saveProgress = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Save profile updates
      if (Object.keys(onboardingData.profile).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(onboardingData.profile)
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // Log the onboarding step completion
      await supabase.from('audit_log').insert({
        actor_user: user.id,
        action: 'ONBOARDING_STEP_COMPLETED',
        entity: 'onboarding',
        entity_id: user.id,
        new_values: { 
          step: currentStep, 
          completed_steps: steps.filter(s => s.completed).length 
        }
      });

    } catch (error) {
      console.error('Error saving onboarding progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to save progress',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    await saveProgress();
    
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete onboarding
      await completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Update user status to Active
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'Active' })
        .eq('id', user.id);

      if (error) throw error;

      // Log completion
      await supabase.from('audit_log').insert({
        actor_user: user.id,
        action: 'ONBOARDING_COMPLETED',
        entity: 'onboarding',
        entity_id: user.id,
        new_values: { 
          completed_at: new Date().toISOString(),
          selected_funds: onboardingData.selected_funds,
          documents_acknowledged: onboardingData.documents_acknowledged
        }
      });

      toast({
        title: 'Welcome to Indigo Yield!',
        description: 'Your onboarding is complete. Redirecting to dashboard...',
      });

      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete onboarding',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (stepId: number) => {
    const step = steps.find(s => s.id === stepId);
    const isCompleted = step?.completed;
    const isCurrent = stepId === currentStep;

    if (isCompleted) return <CheckCircle className="w-5 h-5 text-green-600" />;
    
    switch (stepId) {
      case 1: return <User className={`w-5 h-5 ${isCurrent ? 'text-indigo-600' : 'text-gray-400'}`} />;
      case 2: return <FileCheck className={`w-5 h-5 ${isCurrent ? 'text-indigo-600' : 'text-gray-400'}`} />;
      case 3: return <Target className={`w-5 h-5 ${isCurrent ? 'text-indigo-600' : 'text-gray-400'}`} />;
      default: return null;
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ProfileSetupStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onComplete={() => markStepCompleted(1)}
          />
        );
      case 2:
        return (
          <DocumentsStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onComplete={() => markStepCompleted(2)}
          />
        );
      case 3:
        return (
          <FundSelectionStep
            data={onboardingData}
            availableFunds={availableFunds}
            onUpdate={updateOnboardingData}
            onComplete={() => markStepCompleted(3)}
          />
        );
      default:
        return null;
    }
  };

  const currentStepData = steps.find(s => s.id === currentStep);
  const progressPercent = (currentStep / steps.length) * 100;
  const canProceed = steps[currentStep - 1]?.completed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Indigo Yield
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Let's get your account set up in just a few steps
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  step.completed 
                    ? 'bg-green-100 border-green-600' 
                    : step.id === currentStep 
                      ? 'bg-indigo-100 border-indigo-600' 
                      : 'bg-gray-100 border-gray-300'
                }`}>
                  {getStepIcon(step.id)}
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-1 w-full mx-4 rounded transition-colors ${
                    step.completed ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="text-center mt-2">
            <Badge variant="outline">
              Step {currentStep} of {steps.length}
            </Badge>
          </div>
        </div>

        {/* Current Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStepIcon(currentStep)}
              {currentStepData?.title}
            </CardTitle>
            <CardDescription>
              {currentStepData?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderCurrentStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || loading}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed || loading}
            className="flex items-center gap-2"
          >
            {currentStep === steps.length ? 'Complete Setup' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
