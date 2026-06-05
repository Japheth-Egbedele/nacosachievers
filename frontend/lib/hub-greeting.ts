import type { AuthUser } from './auth-context';

const PLACEHOLDER_MATRICS = new Set(['ADMIN001']);

export function getHubGreeting(user: AuthUser | null): {
  heading: string;
  subtext?: string;
} {
  if (!user) {
    return { heading: 'Welcome' };
  }

  const firstName = user.first_name?.trim() || user.display_name?.split(' ')[0];
  const matric =
    user.matric_number && !PLACEHOLDER_MATRICS.has(user.matric_number)
      ? user.matric_number
      : undefined;

  if (user.role === 'super_admin') {
    return {
      heading: 'Welcome back',
      subtext: 'Chapter administration',
    };
  }

  if (user.role === 'executive') {
    return {
      heading: firstName ? `Welcome, ${firstName}` : 'Welcome',
      subtext: matric ? `Executive access · ${matric}` : 'Executive access',
    };
  }

  return {
    heading: firstName ? `Welcome, ${firstName}` : 'Welcome',
    subtext: matric ? matric : undefined,
  };
}
