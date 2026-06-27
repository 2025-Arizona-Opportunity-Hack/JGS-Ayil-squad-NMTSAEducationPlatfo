import { createContext, useContext, type ReactNode } from "react";

// True while a guided tour is running. Modals that a tour drives read this to
// stay open while the user interacts with the tour's tooltip (which lives
// outside the modal): they disable the focus trap and outside-click-to-close
// so the tour can point at fields without the modal closing underneath it.
const TourActiveContext = createContext(false);

export function TourActiveProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <TourActiveContext.Provider value={active}>
      {children}
    </TourActiveContext.Provider>
  );
}

export function useTourActive(): boolean {
  return useContext(TourActiveContext);
}
