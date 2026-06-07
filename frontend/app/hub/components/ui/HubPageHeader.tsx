import { hubPageSubtitle, hubPageTitle } from '@/lib/hub-styles';

type HubPageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function HubPageHeader({ title, description, action }: HubPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-[#e8e6e1] pb-5 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:pb-6 dark:border-zinc-800">
      <div className="min-w-0 flex-1">
        <h1 className={`${hubPageTitle} break-words`}>{title}</h1>
        {description && <p className={`${hubPageSubtitle} max-w-none sm:max-w-xl`}>{description}</p>}
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </div>
  );
}
