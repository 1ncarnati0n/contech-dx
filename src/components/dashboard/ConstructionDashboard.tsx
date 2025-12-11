'use client';

import { KPICards } from './KPICards';
import { TaktView } from './TaktView';
import { BuildingProgress } from './BuildingProgress';
import { CCTVSection } from './CCTVSection';

export function ConstructionDashboard() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <KPICards />
            <CCTVSection />
            <TaktView />
            <BuildingProgress />
        </div>
    );
}
