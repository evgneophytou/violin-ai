// Client-safe types and constants for the spaced repetition system
// These can be safely imported in client components

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface FSRSState {
  difficulty: number;
  stability: number;
  retrievability: number;
}

export interface SchedulingInfo {
  nextReview: Date;
  interval: number; // in days
  newState: FSRSState;
}

// Rating descriptions for UI
export const RATING_LABELS: Record<Rating, { label: string; description: string; color: string }> = {
  1: { label: 'Again', description: "I couldn't play this correctly", color: 'destructive' },
  2: { label: 'Hard', description: 'It was difficult but I managed', color: 'warning' },
  3: { label: 'Good', description: 'I played it correctly', color: 'default' },
  4: { label: 'Easy', description: 'It was very easy for me', color: 'success' },
};
