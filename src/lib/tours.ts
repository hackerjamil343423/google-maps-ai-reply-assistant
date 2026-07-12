export const TOUR_IDS = ["dashboard-welcome"] as const;
export type TourId = (typeof TOUR_IDS)[number];
export function appendTourId(current: string[] | null | undefined, tourId: TourId) {
  return current?.includes(tourId) ? current : [...(current ?? []), tourId];
}
