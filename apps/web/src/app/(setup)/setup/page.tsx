'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Step components
import WelcomeStep from '@/components/setup/WelcomeStep';
import SalonInfoStep from '@/components/setup/SalonInfoStep';
import PlanStep from '@/components/setup/PlanStep';
import InviteStaffStep from '@/components/setup/InviteStaffStep';
import PrivacySettingsStep from '@/components/setup/PrivacySettingsStep';
import CompleteStep from '@/components/setup/CompleteStep';

interface SetupData {
  salon_info: {
    name: string;
    address: string;
    phone: string;
    business_hours: {
      open: string;
      close: string;
    };
  };
  plan: 'free' | 'standard' | 'premium';
  staff_invitations: Array<{
    email: string;
    role: 'stylist' | 'manager';
  }>;
  privacy_settings: {
    require_customer_consent: boolean;
    consent_message: string;
    data_retention_days: number;
    auto_delete_audio: boolean;
  };
}

const STEPS = [
  { id: 1, title: 'ようこそ', description: 'SalonTalk AIへようこそ' },
  { id: 2, title: '店舗情報', description: '店舗の基本情報を入力' },
  { id: 3, title: 'プラン選択', description: '料金プランを選択' },
  { id: 4, title: 'スタッフ招待', description: 'スタッフを招待' },
  { id: 5, title: 'プライバシー設定', description: 'プライバシー設定' },
  { id: 6, title: '完了', description: 'セットアップ完了' },
];

const initialSetupData: SetupData = {
  salon_info: {
    name: '',
    address: '',
    phone: '',
    business_hours: {
      open: '09:00',
      close: '21:00',
    },
  },
  plan: 'free',
  staff_invitations: [],
  privacy_settings: {
    require_customer_consent: true,
    consent_message: '接客品質向上のため、会話を録音・分析させていただきます。',
    data_retention_days: 90,
    auto_delete_audio: true,
  },
};

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState<SetupData>(initialSetupData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        // TODO: Load from API when auth is implemented
        const savedProgress = localStorage.getItem('setup_progress');
        if (savedProgress) {
          const parsed = JSON.parse(savedProgress);
          setCurrentStep(parsed.current_step || 1);
          setSetupData(prev => ({ ...prev, ...parsed.step_data }));
        }
      } catch (e) {
        console.error('Failed to load progress:', e);
      }
    };
    loadProgress();
  }, []);

  // Save progress
  const saveProgress = async () => {
    try {
      const progress = {
        current_step: currentStep,
        step_data: setupData,
      };
      localStorage.setItem('setup_progress', JSON.stringify(progress));
      // TODO: Save to API when auth is implemented
    } catch (e) {
      console.error('Failed to save progress:', e);
    }
  };

  const handleNext = async () => {
    await saveProgress();
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Call complete-salon-setup API when auth is implemented
      console.log('Completing setup with data:', setupData);

      // Clear saved progress
      localStorage.removeItem('setup_progress');

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (e) {
      setError('セットアップの完了に失敗しました。もう一度お試しください。');
      console.error('Failed to complete setup:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetupData = (key: keyof SetupData, value: unknown) => {
    setSetupData(prev => ({ ...prev, [key]: value }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep onNext={handleNext} />;
      case 2:
        return (
          <SalonInfoStep
            data={setupData.salon_info}
            onChange={(data) => updateSetupData('salon_info', data)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <PlanStep
            selected={setupData.plan}
            onChange={(plan) => updateSetupData('plan', plan)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <InviteStaffStep
            invitations={setupData.staff_invitations}
            onChange={(invitations) => updateSetupData('staff_invitations', invitations)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <PrivacySettingsStep
            data={setupData.privacy_settings}
            onChange={(data) => updateSetupData('privacy_settings', data)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 6:
        return (
          <CompleteStep
            onComplete={handleComplete}
            onBack={handleBack}
            isLoading={isLoading}
            error={error}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex items-center ${
                step.id < STEPS.length ? 'flex-1' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.id < currentStep
                    ? 'bg-primary-600 text-white'
                    : step.id === currentStep
                    ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step.id < currentStep ? '✓' : step.id}
              </div>
              {step.id < STEPS.length && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step.id < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          {STEPS.map((step) => (
            <span key={step.id} className="w-20 text-center">
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {renderStep()}
      </div>
    </div>
  );
}
