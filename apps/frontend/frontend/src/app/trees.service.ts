import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { appRuntimeConfig } from './app-config';
import { SkillNode } from './nodes.service';

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

  generateTree(id: string, prompt: string) {
    return this.http.post<SkillNode[]>(`${this.apiUrl}/${id}/generate`, { prompt });
  }
}
