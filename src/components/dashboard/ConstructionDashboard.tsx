'use client';

import { KPICards } from './KPICards';
import { TaktView } from './TaktView';
import { BuildingProgress } from './BuildingProgress';
import { CCTVSection } from './CCTVSection';

interface Props {
    projectId: string;
}

export function ConstructionDashboard({ projectId }: Props) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <KPICards />
            <CCTVSection projectId={projectId} />
            <TaktView />
            <BuildingProgress />
        </div>
    );
}
