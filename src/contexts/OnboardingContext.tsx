import React, { createContext, useContext, useState, useCallback } from 'react';

interface OnboardingContextType {
    isOnboarded: boolean | null;
    setIsOnboarded: (value: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

    return (
        <OnboardingContext.Provider value={{ isOnboarded, setIsOnboarded }}>
            {children}
        </OnboardingContext.Provider>
    );
}

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (context === undefined) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
}
