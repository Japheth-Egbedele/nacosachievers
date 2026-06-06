import {
  ChevronLeft,
  ClipboardList,
  Home,
  Key,
  LogOut,
  Settings,
  User,
  Wallet,
  BookOpen,
} from 'lucide-react';

type IconProps = { className?: string };

const iconBase = 'h-5 w-5 shrink-0';

export function IconElections({ className = '' }: IconProps) {
  return <ClipboardList className={`${iconBase} ${className}`} strokeWidth={1.75} aria-hidden />;
}

export function IconAdmin({ className = '' }: IconProps) {
  return <Settings className={`${iconBase} ${className}`} strokeWidth={1.75} aria-hidden />;
}

export function IconLogout({ className = '' }: IconProps) {
  return <LogOut className={`${iconBase} ${className}`} strokeWidth={1.75} aria-hidden />;
}

export function IconHome({ className = '' }: IconProps) {
  return <Home className={`${iconBase} ${className}`} strokeWidth={1.75} aria-hidden />;
}

export function IconChevronLeft({ className = '' }: IconProps) {
  return <ChevronLeft className={`h-4 w-4 shrink-0 ${className}`} strokeWidth={2} aria-hidden />;
}

export function IconUser({ className = '' }: IconProps) {
  return <User className={`${iconBase} ${className}`} strokeWidth={1.75} aria-hidden />;
}

export function IconKey({ className = '' }: IconProps) {
  return <Key className={`${iconBase} ${className}`} strokeWidth={1.75} aria-hidden />;
}

export function IconVault({ className = '' }: IconProps) {
  return <BookOpen className={`${iconBase} ${className}`} strokeWidth={1.75} aria-hidden />;
}

export function IconWallet({ className = '' }: IconProps) {
  return <Wallet className={`${iconBase} ${className}`} strokeWidth={1.75} aria-hidden />;
}
