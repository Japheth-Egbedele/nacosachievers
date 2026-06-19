export interface ElectionPositionCandidate {
  id: string;
  name: string;
  manifesto?: string | null;
  image_url?: string | null;
  vote_count?: number;
  vote_percentage?: number;
  is_winner?: boolean;
  is_tie?: boolean;
  quorum_not_met?: boolean;
}

export interface ElectionPosition {
  id: string;
  title: string;
  sort_order: number;
  candidates: ElectionPositionCandidate[];
  total_votes?: number;
  ballots_cast?: number;
  abstention_count?: number;
  abstention_percentage?: number;
  contestant_count?: number;
  winner?: { id: string; name: string; vote_count: number } | null;
  is_tie?: boolean;
  quorum_not_met?: boolean;
  min_votes_required?: number;
  eligible_voters?: number;
}

export interface LevelTurnoutStat {
  level: string;
  eligible: number;
  voted: number;
  turnout_percentage: number;
  share_of_voters?: number;
}

export interface DepartmentTurnoutStat {
  department_id: string | null;
  department_name: string;
  eligible: number;
  voted: number;
  turnout_percentage: number;
}

export interface ElectionAnalyticsExtended {
  level_turnout: LevelTurnoutStat[];
  department_turnout?: DepartmentTurnoutStat[];
  most_active_level: LevelTurnoutStat | null;
  least_active_level: LevelTurnoutStat | null;
  turnout_spread: number;
  average_winner_share: number;
  average_winning_margin: number;
  strongest_candidate: { name: string; position: string; percentage: number } | null;
  published_at: string;
}

export interface ElectionAnalytics {
  unique_voters: number;
  eligible_voters: number;
  turnout_percentage: number;
  positions_count: number;
  contestable_positions: number;
  total_contestants: number;
  extended?: ElectionAnalyticsExtended;
}

export interface ElectionResultsPayload {
  positions: ElectionPosition[];
  analytics: ElectionAnalytics;
}
