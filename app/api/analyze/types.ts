export type ParsedRequest = {
  title: string;
  text: string;
  url: string;
};

export type AnalyzeRequest = {
  title?: unknown;
  text?: unknown;
  url?: unknown;
};

export type Analysis = {
  page_type: string;
  subject: string;
  summary: string;
  key_information: string[];
  people: string[];
  organizations: string[];
  products_or_services: string[];
  topics: string[];
  important_dates: string[];
  important_numbers: string[];
  links: string[];
  other_relevant_information: string[];
};

export const EMPTY_ANALYSIS: Analysis = {
  page_type: "",
  subject: "",
  summary: "",
  key_information: [],
  people: [],
  organizations: [],
  products_or_services: [],
  topics: [],
  important_dates: [],
  important_numbers: [],
  links: [],
  other_relevant_information: [],
};

export const ANALYSIS_FIELDS = [
  "page_type",
  "subject",
  "summary",
  "key_information",
  "people",
  "organizations",
  "products_or_services",
  "topics",
  "important_dates",
  "important_numbers",
  "links",
  "other_relevant_information",
] as const;

export type AnalysisField = (typeof ANALYSIS_FIELDS)[number];