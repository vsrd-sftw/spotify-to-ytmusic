import type { KeyboardEvent, ReactNode } from 'react';

export interface TabDef {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabDef[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
}

export interface TabPanelProps {
  id: string;
  labelledBy: string;
  active: boolean;
  children: ReactNode;
}

export function TabPanel({ id, labelledBy, active, children }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={id}
      aria-labelledby={labelledBy}
      hidden={!active}
    >
      {children}
    </div>
  );
}

export function Tabs({ tabs, activeTab, onTabChange, children }: TabsProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    if (e.key === 'ArrowRight') {
      const next = tabs[(currentIndex + 1) % tabs.length];
      onTabChange(next.id);
    } else if (e.key === 'ArrowLeft') {
      const prev = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      onTabChange(prev.id);
    }
  }

  return (
    <div>
      <div role="tablist" onKeyDown={handleKeyDown} className="flex border-b">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              className={[
                'px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isActive
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
