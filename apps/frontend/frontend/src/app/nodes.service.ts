import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

export interface SkillNode {
  id: string;
  treeId: string;
  parentId?: string;
  title: string;
  description?: string;
  icon?: string;
  positionX: number;
  positionY: number;
  progress: number;
  level?: number;
  maxLevel?: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NodesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/nodes`;

  getNodesByTree(treeId: string) {
    return this.http.get<SkillNode[]>(`${this.apiUrl}/tree/${treeId}`);
  }

  createNode(node: Partial<SkillNode>) {
    return this.http.post<SkillNode>(this.apiUrl, node);
  }

  updateNode(id: string, node: Partial<SkillNode>) {
    return this.http.patch<SkillNode>(`${this.apiUrl}/${id}`, node);
  }

  deleteNode(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
