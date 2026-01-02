import React from 'react';
import { TabId } from '../types';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

const tabs: { id: TabId; icon: string; label: string }[] = [
  { id: 'dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
  { id: 'client', icon: 'bi-display', label: 'Monitor' },
  { id: 'players', icon: 'bi-people', label: 'Players' },
  { id: 'config', icon: 'bi-gear', label: 'Config' },
  { id: 'pipeline', icon: 'bi-diagram-3', label: 'Pipeline' },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="sidebar">
      <nav className="nav flex-column pt-3">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.id}-tab`}
            className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onTabChange(tab.id);
            }}
          >
            <i className={`bi ${tab.icon}`}></i>
            <span>{tab.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
