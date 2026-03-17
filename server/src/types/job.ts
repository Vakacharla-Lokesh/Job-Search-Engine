export interface JobDocument {
  id: string;
  title: string;
  description: string;
  company: string;
  location: string;
  remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  skills: string[];
  source_url: string;
  posted_at: string; // ISO 8601
  source: "remotive" | "hn";
  embedding?: number[];
}
