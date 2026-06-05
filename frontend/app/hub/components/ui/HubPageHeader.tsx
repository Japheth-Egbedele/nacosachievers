type HubPageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function HubPageHeader({ title, description, action }: HubPageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-[#e8e6e1] pb-6 dark:border-zinc-800">
      <div>
        <h1 className="hub-page-title">{title}</h1>
        {description && <p className="hub-page-subtitle">{description}</p>}
      </div>
      {action}
    </div>
  );
}
