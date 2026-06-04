export interface ElectionPositionCandidate {
  id: string;
  name: string;
  manifesto?: string | null;
  image_url?: string | null;
  vote_count?: number;
  vote_percentage?: number;
  is_winner?: boolean;
  is_tie?: boolean;
}

export interface ElectionPosition {
  id: string;
  title: string;
  sort_order: number;
  candidates: ElectionPositionCandidate[];
  total_votes?: number;
  contestant_count?: number;
  winner?: { id: string; name: string; vote_count: number } | null;
  is_tie?: boolean;
}

export interface ElectionAnalytics {
  unique_voters: number;
  eligible_voters: number;
  turnout_percentage: number;
  positions_count: number;
  contestable_positions: number;
  total_contestants: number;
}

export interface ElectionResultsPayload {
  positions: ElectionPosition[];
  analytics: ElectionAnalytics;
}
