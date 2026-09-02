import { useState, useCallback, useMemo } from "react";
import { type Guide } from "./guideContent";

export interface UseGuides {
  launcherOpen: boolean;
  writtenGuide: Guide | null;
  tourGuide: Guide | null;
  openLauncher: () => void;
  closeLauncher: () => void;
  readSteps: (guideId: string) => void;
  startTour: (guideId: string) => void;
  closeWritten: () => void;
  closeTour: () => void;
}

export function useGuides(guides: Guide[]): UseGuides {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [writtenGuideId, setWrittenGuideId] = useState<string | null>(null);
  const [tourGuideId, setTourGuideId] = useState<string | null>(null);

  const findGuide = useCallback(
    (id: string | null): Guide | null =>
      id ? (guides.find((g) => g.id === id) ?? null) : null,
    [guides],
  );

  const openLauncher = useCallback(() => setLauncherOpen(true), []);
  const closeLauncher = useCallback(() => setLauncherOpen(false), []);

  const readSteps = useCallback((guideId: string) => {
    setLauncherOpen(false);
    setTourGuideId(null);
    setWrittenGuideId(guideId);
  }, []);

  const startTour = useCallback((guideId: string) => {
    setLauncherOpen(false);
    setWrittenGuideId(null);
    setTourGuideId(guideId);
  }, []);

  const closeWritten = useCallback(() => setWrittenGuideId(null), []);
  const closeTour = useCallback(() => setTourGuideId(null), []);

  const writtenGuide = useMemo(() => findGuide(writtenGuideId), [findGuide, writtenGuideId]);
  const tourGuide = useMemo(() => findGuide(tourGuideId), [findGuide, tourGuideId]);

  return {
    launcherOpen,
    writtenGuide,
    tourGuide,
    openLauncher,
    closeLauncher,
    readSteps,
    startTour,
    closeWritten,
    closeTour,
  };
}
