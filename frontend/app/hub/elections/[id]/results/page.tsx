import type { Metadata } from 'next';
import PublicElectionResults from './PublicElectionResults';
import { API_BASE } from '@/lib/api';
import type { ElectionPosition, ElectionAnalytics } from '@/lib/election-types';

type PublicResultsPayload = {
  election: {
    id: string;
    title: string;
    status: string;
  };
  positions: ElectionPosition[];
  analytics: ElectionAnalytics;
};

async function fetchPublicResults(id: string): Promise<PublicResultsPayload | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/elections/${id}/public-results`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: PublicResultsPayload };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchPublicResults(id);
  const title = data?.election.title ?? 'Election results';
  const turnout = data?.analytics.turnout_percentage;

  return {
    title: `${title} — Official results | NACOS Achievers`,
    description: turnout
      ? `Official NACOS Achievers election results for ${title}. ${turnout}% turnout.`
      : `Official NACOS Achievers election results for ${title}.`,
    openGraph: {
      title: `${title} — Official results`,
      description: 'NACOS Achievers University Chapter election results.',
      type: 'website',
    },
  };
}

export default async function PublicResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchPublicResults(id);

  return <PublicElectionResults id={id} initialData={data} />;
}
