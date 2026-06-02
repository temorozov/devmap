export interface EvidenceRepo {
  name: string;
  url: string;
  evidence: string;
}

export interface DetectedTech {
  tech: string;
  canonicalTitle: string;
  category: string;
  icon: string;
  prerequisites: string[];
  repos: EvidenceRepo[];
  lastSeen: string;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  language: string | null;
  pushed_at: string;
  fork: boolean;
}
