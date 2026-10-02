export type BriefRequest = {
  data?: unknown;
};

export type Briefing = {
  title: string;
  overview: string;
  key_points: string[];
  details: string[];
};

export const EMPTY_BRIEFING: Briefing = {
  title: "",
  overview: "",
  key_points: [],
  details: [],
};
