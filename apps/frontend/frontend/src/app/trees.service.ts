import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { appRuntimeConfig } from './app-config';
import { SkillNode } from './nodes.service';

export interface PublicProfile {
  handle: string;
  name: string | null;
  githubUsername: string | null;
  memberSince: string;
  verifiedSkills: number;
  totalSkills: number;
  devMap: Tree | null;
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

  getExploreProfiles() {
    return this.http.get<ExploreProfile[]>(`${this.apiUrl}/explore`);
  }

  scanUser(username: string) {
    return this.http.get<GuestScanResult>(`${appRuntimeConfig.apiUrl}/github/scan/${encodeURIComponent(username)}`);
  }

  compareUsers(handleA: string, handleB: string) {
    return this.http.get<CompareResult>(`${this.apiUrl}/compare/${encodeURIComponent(handleA)}/${encodeURIComponent(handleB)}`);
  }

}

export interface ExploreProfile {
  handle: string;
  name: string | null;
  githubUsername: string | null;
  verifiedSkills: number;
  topSkills: string[];
}

export interface GuestScanSkill {
  title: string;
  category: string;
  icon: string;
  repoCount: number;
}

export interface GuestScanResult {
  handle: string;
  skills: GuestScanSkill[];
  scannedAt: string;
}

export interface CompareProfile {
  handle: string;
  name: string | null;
  githubUsername: string | null;
  skillCount: number;
  source: 'member' | 'github';
}

export interface CompareResult {
  a: CompareProfile;
  b: CompareProfile;
  inCommon: string[];
  onlyA: string[];
  onlyB: string[];
}
