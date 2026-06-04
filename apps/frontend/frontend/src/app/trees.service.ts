import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { appRuntimeConfig } from './app-config';
import { SkillNode } from './nodes.service';

export interface ProfileViewStats {
  thisWeek: number;
  lastWeek: number;
  total: number;
}

export interface PublicProfile {
  handle: string;
  name: string | null;
  githubUsername: string | null;
  targetRole: string | null;
  memberSince: string;
  verifiedSkills: number;
  totalSkills: number;
  devMap: Tree | null;
  views?: ProfileViewStats;
}

export interface Tree {
  id: string;
  title: string;
  sharedToken: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  nodes?: SkillNode[];
  activities?: { date: string; count: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class TreesService {
  private http = inject(HttpClient);
  private apiUrl = `${appRuntimeConfig.apiUrl}/trees`;

  getTrees() {
    return this.http.get<Tree[]>(this.apiUrl);
  }

  getTree(id: string) {
    return this.http.get<Tree>(`${this.apiUrl}/${id}`);
  }

  getSharedTree(token: string) {
    return this.http.get<Tree>(`${this.apiUrl}/shared/${token}`);
  }

  createTree(title: string) {
    return this.http.post<Tree>(this.apiUrl, { title });
  }

  updateTree(id: string, title: string) {
    return this.http.patch<Tree>(`${this.apiUrl}/${id}`, { title });
  }

  deleteTree(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getPublicProfile(handle: string) {
    return this.http.get<PublicProfile>(`${this.apiUrl}/profile/${handle}`);
  }

  syncGitHub() {
    return this.http.post<{ nodeCount: number; verifiedCount: number; newSkills: string[] }>(
      `${appRuntimeConfig.apiUrl}/github/sync`,
      {},
    );
  }

  getViewStats() {
    return this.http.get<ProfileViewStats>(`${this.apiUrl}/my/view-stats`);
  }

  matchJd(text: string) {
    return this.http.post<{
      required: number;
      matched: { title: string; level: number }[];
      missing: string[];
      score: number;
    }>(`${this.apiUrl}/my/jd-match`, { text });
  }

  getMySkills() {
    return this.http.get<string[]>(`${this.apiUrl}/my/skills`);
  }

  getExploreProfiles() {
    return this.http.get<ExploreProfile[]>(`${this.apiUrl}/explore`);
  }

  saveTargetRole(roleKey: string) {
    return this.http.put(`${this.apiUrl}/my/target-role`, { roleKey });
  }
}

export interface ExploreProfile {
  handle: string;
  name: string | null;
  githubUsername: string | null;
  verifiedSkills: number;
  topSkills: string[];
}
