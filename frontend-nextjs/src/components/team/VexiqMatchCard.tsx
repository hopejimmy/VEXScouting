'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Match } from '@/hooks/useTeamMatches';
import { TeamDriverSkills } from '@/hooks/useTeamDriverSkills';

interface VexiqMatchCardProps {
    match: Match;
    teamNumber: string;
    skillsMap: Record<string, TeamDriverSkills>;
}

export function VexiqMatchCard({ match, teamNumber, skillsMap }: VexiqMatchCardProps) {
    // VEXIQ is cooperative: the "red" and "blue" fields are partners, not opponents.
    // Flatten all teams from every alliance and split into focused vs. partners.
    const allTeams = match.alliances.flatMap(a => a.teams);
    const focused = allTeams.find(t => t.team.name === teamNumber);
    const partners = allTeams.filter(t => t.team.name !== teamNumber);

    // VEXIQ alliances score identically; pick the first available.
    const score = match.alliances[0]?.score ?? 0;
    const showScoreBadge = match.started && match.alliances[0]?.score !== undefined && match.alliances[0]?.score !== null;

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3 px-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <span className="font-bold text-gray-900">{match.name}</span>
                        <Badge variant="outline" className="bg-white">
                            {new Date(match.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                    </div>
                    {showScoreBadge && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                            SCORE {score}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
                    <TeamPanel role="you" team={focused?.team.name ?? teamNumber} skills={skillsMap[focused?.team.name ?? teamNumber]} sitting={focused?.sitting} />
                    <div className="flex items-center justify-center text-slate-400 font-bold text-2xl px-1">+</div>
                    {partners.length > 0 ? (
                        <TeamPanel role="partner" team={partners[0].team.name} skills={skillsMap[partners[0].team.name]} sitting={partners[0].sitting} />
                    ) : (
                        <PartnerPlaceholder />
                    )}
                </div>

                {/* Defensive: in the unexpected case of 3+ teams in a VEXIQ match,
                    render extras below the main pair instead of dropping them. */}
                {partners.length > 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {partners.slice(1).map(p => (
                            <TeamPanel key={p.team.id} role="partner" team={p.team.name} skills={skillsMap[p.team.name]} sitting={p.sitting} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function TeamPanel({
    role,
    team,
    skills,
    sitting,
}: {
    role: 'you' | 'partner';
    team: string;
    skills?: TeamDriverSkills;
    sitting?: boolean;
}) {
    const isYou = role === 'you';
    const panelClasses = isYou
        ? 'bg-blue-50 border border-blue-200'
        : 'bg-yellow-50 border border-amber-200';
    const labelClasses = isYou ? 'text-blue-700' : 'text-amber-700';
    const valueClasses = isYou ? 'text-sky-600' : 'text-slate-700';

    return (
        <div className={`${panelClasses} rounded-lg p-3 text-center`}>
            <div className={`text-[10px] font-semibold tracking-wider uppercase ${labelClasses}`}>
                {isYou ? 'YOU' : 'PARTNER'}
            </div>
            <div className="mt-1 flex items-center justify-center gap-2">
                <span className="font-bold text-[15px] text-slate-900">{team}</span>
                {typeof skills?.rank === 'number' && (
                    <Badge variant="outline" className="text-[10px] font-normal text-gray-500 bg-white h-5 px-1.5">
                        #{skills.rank}
                    </Badge>
                )}
                {sitting && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">Sit</Badge>
                )}
            </div>
            <div className="text-[10px] text-slate-500 mt-2">Best Driver Skill</div>
            <div className={`text-[18px] font-bold ${valueClasses}`}>
                {typeof skills?.highestDriverSkills === 'number' ? (
                    skills.highestDriverSkills
                ) : (
                    <span title="No driver skill on record">—</span>
                )}
            </div>
        </div>
    );
}

function PartnerPlaceholder() {
    return (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3 text-center flex items-center justify-center">
            <span className="text-sm text-slate-400">Partner TBD</span>
        </div>
    );
}
