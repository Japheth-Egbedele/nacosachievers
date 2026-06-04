import HubShell from '../components/HubShell';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <HubShell>{children}</HubShell>;
}
