import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { CheckCircle, Circle, ArrowRight, ArrowLeft, Shield, FileText, Coins, UserCheck } from 'lucide-react';
import { getSteps, completeStep, getAvailableAssets, updateAssetSelection, type OnboardingStep, type AvailableAsset } from '@/server/onboarding';
import { useNavigate } from 'react-router-dom';

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [assets, setAssets] = useState<AvailableAsset[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    try {
      setLoading(true);
      const [stepsData, assetsData] = await Promise.all([
        getSteps(),
        getAvailableAssets(),
      ]);
      setSteps(stepsData);
      setAssets(assetsData);
      
      // Find first incomplete step
      const firstIncomplete = stepsData.findIndex(step => !step.completed);
      setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0);
    } catch (error) {
      console.error('Failed to load onboarding data:', error);
      toast.error('Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async () => {
    if (currentStep >= steps.length) return;
    
    const step = steps[currentStep];
    setActionLoading(true);

    try {
      // Handle asset selection step
      if (step.id === 'asset-selection' && selectedAssets.length === 0) {
        toast.error('Please select at least one asset to continue');
        return;
      }

      if (step.id === 'asset-selection') {
        await updateAssetSelection(selectedAssets);
      }

      const result = await completeStep(step.id);
      
      if (result.success) {
        // Update step completion
        setSteps(prev => prev.map(s => 
          s.id === step.id ? { ...s, completed: true } : s
        ));
        
        toast.success(`${step.title} completed!`);
        
        // Move to next step or finish
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          toast.success('Onboarding completed! Welcome to Indigo Yield Platform.');
          navigate('/dashboard');
        }
      } else {
        toast.error('Failed to complete step. Please try again.');
      }
    } catch (error) {
      console.error('Failed to complete step:', error);
      toast.error('Failed to complete step');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssetToggle = (assetSymbol: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetSymbol)
        ? prev.filter(s => s !== assetSymbol)
        : [...prev, assetSymbol]
    );
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStepIcon = (step: OnboardingStep, index: number) => {
    if (step.completed) {
      return <CheckCircle className="h-6 w-6 text-green-600" />;
    }
    if (index === currentStep) {
      return <Circle className="h-6 w-6 text-blue-600 fill-blue-600" />;
    }
    return <Circle className="h-6 w-6 text-gray-400" />;
  };

  const renderStepContent = () => {
    if (currentStep >= steps.length) return null;
    
    const step = steps[currentStep];
    
    switch (step.id) {
      case 'profile-review':
        return (
          <div className="text-center py-8">
            <UserCheck className="h-16 w-16 mx-auto text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Profile Review</h3>
            <p className="text-gray-600 mb-6">
              Please review your profile information. You can update your details in account settings after completing onboarding.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
              <p><strong>Email:</strong> investor@example.com</p>
              <p><strong>Name:</strong> John Doe</p>
              <p><strong>Status:</strong> Verified</p>
            </div>
          </div>
        );

      case 'risk-assessment':
        return (
          <div className="text-center py-8">
            <Shield className="h-16 w-16 mx-auto text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Risk Assessment</h3>
            <p className="text-gray-600 mb-6">
              Based on your profile, we've determined your risk tolerance as <strong>Moderate</strong>.
              This allows you to invest in a balanced mix of assets.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
              <p className="text-blue-800">
                ✓ You can invest in low and medium-risk assets<br/>
                ✓ Diversified portfolio recommended<br/>
                ✓ Regular monitoring suggested
              </p>
            </div>
          </div>
        );

      case 'document-acknowledgement':
        return (
          <div className="text-center py-8">
            <FileText className="h-16 w-16 mx-auto text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Document Acknowledgement</h3>
            <p className="text-gray-600 mb-6">
              Please acknowledge that you have read and understand the following documents:
            </p>
            <div className="space-y-3 max-w-md mx-auto text-left">
              <div className="flex items-center space-x-2">
                <Checkbox defaultChecked disabled />
                <span>Terms of Service</span>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox defaultChecked disabled />
                <span>Privacy Policy</span>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox defaultChecked disabled />
                <span>Risk Disclosure</span>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox defaultChecked disabled />
                <span>Fee Schedule</span>
              </div>
            </div>
          </div>
        );

      case 'asset-selection':
        return (
          <div className="py-8">
            <div className="text-center mb-8">
              <Coins className="h-16 w-16 mx-auto text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Choose Your Assets</h3>
              <p className="text-gray-600">
                Select the assets you'd like to earn yield on. You can modify your selection later.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map(asset => (
                <Card 
                  key={asset.symbol} 
                  className={`cursor-pointer transition-all ${
                    selectedAssets.includes(asset.symbol) 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleAssetToggle(asset.symbol)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{asset.symbol}</CardTitle>
                      <Checkbox 
                        checked={selectedAssets.includes(asset.symbol)}
                        disabled
                      />
                    </div>
                    <p className="text-sm text-gray-600">{asset.name}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current APY</span>
                        <span className="font-semibold text-green-600">
                          {asset.current_apy.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Min Investment</span>
                        <span>${asset.min_investment.toLocaleString()}</span>
                      </div>
                      <Badge className={getRiskLevelColor(asset.risk_level)}>
                        {asset.risk_level} risk
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{asset.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {selectedAssets.length > 0 && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Selected Assets:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAssets.map(symbol => (
                    <Badge key={symbol} variant="secondary">
                      {symbol}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'final-confirmation':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Ready to Start!</h3>
            <p className="text-gray-600 mb-6">
              You've successfully completed the onboarding process. Your account is ready for investing.
            </p>
            <div className="bg-green-50 p-4 rounded-lg max-w-md mx-auto text-left">
              <h4 className="font-medium text-green-800 mb-2">Summary:</h4>
              <p className="text-sm text-green-700">
                ✓ Profile verified<br/>
                ✓ Risk assessment: Moderate<br/>
                ✓ Documents acknowledged<br/>
                ✓ {selectedAssets.length} assets selected<br/>
              </p>
            </div>
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Indigo Yield</h1>
          <p className="text-gray-600">Complete your setup to start earning yield on your crypto assets</p>
        </div>

        {/* Progress */}
        <div className="max-w-2xl mx-auto mb-8">
          <Progress value={progress} className="h-2 mb-4" />
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center">
                {renderStepIcon(step, index)}
                <span className="text-xs mt-2 text-center max-w-20">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
          
          {/* Actions */}
          <div className="flex justify-between p-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0 || actionLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <Button
              onClick={handleStepComplete}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
