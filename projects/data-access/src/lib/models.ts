export type BuildStatus = 'BUILDING' | 'LIVE' | 'FAILED';
export type FollowUp = 'NONE' | 'PENDING' | 'SEEN' | 'DONE';

export interface Board {
  id: string;
  parent_board_id: string | null;
  kind_cd: 'OVERVIEW' | 'DETAIL' | 'BRIEFING';
  title: string;
  origin_cd: string;
  build_status_cd: BuildStatus;
  settings: Record<string, any>;
  version: number;
  next_review_at: string | null;
}

export interface Tile {
  id: string;
  board_id: string;
  position: number;
  slot_key: string;
  title: string;
  visual_cd: 'STAT' | 'TREND' | 'BREAKDOWN' | 'NOTE';
  tier_cd: 'ALERT' | 'HEADLINE' | 'CONTEXT';
  priority_cd: 'LOW' | 'MEDIUM' | 'HIGH';
  follow_up_cd: FollowUp;
  detail_board_id: string | null;
  briefing_board_id: string | null;
  presentation: Record<string, any>;
}

export interface Row {
  label: string;
  value: number;
  projected?: boolean;
}

export type QueryResult =
  | { shape: 'stat'; unit: string; value: number; baseline: number; change_pct: number; higher_is_better: boolean }
  | { shape: 'series'; unit: string; rows: Row[] }
  | { shape: 'categories'; unit: string; rows: Row[] };

export interface TileData {
  tile_id: string;
  status: 'OK' | 'ERROR';
  result: QueryResult | null;
  error: string | null;
}

export interface StreamEvent {
  event: string;
  data: any;
}

export interface BoardEvent {
  type: string;
  boardId?: string;
  version?: number;
}
