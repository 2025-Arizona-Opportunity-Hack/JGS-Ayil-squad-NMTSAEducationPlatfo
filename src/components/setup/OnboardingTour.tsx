import { useState, useEffect } from "react";
import { GuidedTour, type TourStop } from "../guides/GuidedTour";

const WELCOME_STOPS: TourStop[] = [
  {
    target: "sidebar-content",
    title: "Content Management",
    description:
      "Create, edit, and organize your educational content here. Upload videos, documents, and more.",
    position: "right",
  },
  {
    target: "sidebar-users",
    title: "User Management",
    description:
      "Manage your team and clients. Send invitations, review join requests, and control permissions.",
    position: "right",
  },
  {
    target: "invite-client",
    title: "Invite Clients",
    description:
      "Use this button to quickly invite new clients to your platform via email.",
    position: "bottom",
  },
  {
    target: "sidebar-system",
    title: "System Settings",
    description:
      "Configure your platform settings, notification preferences, and branding here.",
    position: "right",
  },
  {
    target: "theme-toggle",
    title: "Dark Mode",
    description:
      "Toggle between light and dark mode. Your users will see their own preference.",
    position: "bottom",
  },
];

const TOUR_STORAGE_KEY = "onboarding-tour-completed";

interface OnboardingTourProps {
  forceShow?: boolean;
}

export function OnboardingTour({ forceShow }: OnboardingTourProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setActive(true);
      return;
    }
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleComplete = () => {
    setActive(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  };

  if (!active) return null;

  return <GuidedTour stops={WELCOME_STOPS} onClose={handleComplete} />;
}
