import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { WelcomeStep } from "./WelcomeStep";
import { ProfileStep } from "./ProfileStep";
import { OrganizationStep } from "./OrganizationStep";
import { CompleteStep } from "./CompleteStep";
import { SetupLockScreen } from "./SetupLockScreen";

export interface SetupData {
  firstName: string;
  lastName: string;
  profilePictureId?: Id<"_storage">;
  organizationName: string;
  tagline: string;
  logoId?: Id<"_storage">;
  primaryColor: string;
  defaultEmail: boolean;
  defaultSms: boolean;
}

const INITIAL_DATA: SetupData = {
  firstName: "",
  lastName: "",
  organizationName: "",
  tagline: "",
  primaryColor: "#3b82f6",
  defaultEmail: true,
  defaultSms: false,
};

type Step = "welcome" | "profile" | "organization" | "complete";

export function SetupWizard() {
  const [step, setStep] = useState<Step>("welcome");
  const [data, setData] = useState<SetupData>(INITIAL_DATA);
  const [lockAcquired, setLockAcquired] = useState(false);

  const setupLock = useQuery(api.setup.getSetupLock);

  const updateData = useCallback((partial: Partial<SetupData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleLockAcquired = useCallback(() => {
    setLockAcquired(true);
  }, []);

  const handleAuthComplete = useCallback(() => {
    setStep("profile");
  }, []);

  const handleProfileComplete = useCallback(() => {
    setStep("organization");
  }, []);

  const handleOrganizationComplete = useCallback(() => {
    setStep("complete");
  }, []);

  // Show lock screen if someone else is setting up
  if (setupLock && !lockAcquired) {
    return <SetupLockScreen />;
  }

  const steps: { key: Step; label: string }[] = [
    { key: "welcome", label: "Welcome" },
    { key: "profile", label: "Profile" },
    { key: "organization", label: "Organization" },
    { key: "complete", label: "Complete" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Progress bar */}
      <nav aria-label="Setup progress" className="w-full max-w-md mb-8">
        <ol className="flex items-center justify-between">
          {steps.map((s, i) => (
            <li key={s.key} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  i <= currentIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                aria-current={i === currentIndex ? "step" : undefined}
              >
                {i + 1}
              </div>
              <span className="sr-only">{s.label}</span>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 sm:w-20 h-0.5 mx-1 transition-colors ${
                    i < currentIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {step === "welcome" && (
        <WelcomeStep
          onLockAcquired={handleLockAcquired}
          onAuthComplete={handleAuthComplete}
        />
      )}
      {step === "profile" && (
        <ProfileStep
          data={data}
          updateData={updateData}
          onComplete={handleProfileComplete}
        />
      )}
      {step === "organization" && (
        <OrganizationStep
          data={data}
          updateData={updateData}
          onComplete={handleOrganizationComplete}
        />
      )}
      {step === "complete" && <CompleteStep data={data} />}
    </div>
  );
}
