/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Person {
  id: string;
  grade: string;
  name: string;
  category: 'Oficiales' | 'Suboficiales' | 'Patrulleros' | 'Desconocido';
  assigned: boolean;
  assignmentLocation?: string;
}

export interface Team {
  id: string;
  name: string;
  members: string[]; // IDs of persons
}

export interface CaiSection {
  id: string;
  name: string;
  teams: Team[];
}

export interface OtherGroup {
  id: string;
  name: string;
  members: string[];
  defaultName?: string;
}

export interface AppConfig {
  caiSections: CaiSection[];
  otherGroups: OtherGroup[];
}

export interface GlobalConfig {
  commanderName: string;
  commanderRank: string;
  vigilanceHeadName: string;
  vigilanceHeadRank: string;
  importantServices: string[];
}

export interface FullState {
  allPersonnelLists: Record<string, Person[]>;
  configurations: Record<string, AppConfig>;
  currentListId: string;
  globalConfig: GlobalConfig;
}
