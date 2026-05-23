import { motion } from 'framer-motion';
import { UsersRound } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { EmployeeKPIs } from '@/hooks/useEmployeeKPIs';

interface BiologicalSexInfographicProps {
  kpis?: EmployeeKPIs;
  isLoading?: boolean;
}

type SexKind = 'female' | 'male' | 'unknown';

const sexColors: Record<SexKind, string> = {
  female: '#FF5A3D',
  male: '#10A5BC',
  unknown: '#354052',
};

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function SexAvatar({ kind, color }: { kind: SexKind; color: string }) {
  const isFemale = kind === 'female';
  const isUnknown = kind === 'unknown';

  return (
    <svg viewBox="0 0 88 88" className="h-16 w-16" aria-hidden="true">
      <circle cx="44" cy="28" r="16" fill={`${color}2B`} stroke={color} strokeWidth="4" />
      {isFemale && (
        <path
          d="M22 63c5-14 12-21 22-21s17 7 22 21c-9 8-35 8-44 0Z"
          fill={`${color}35`}
          stroke={color}
          strokeLinejoin="round"
          strokeWidth="4"
        />
      )}
      {!isFemale && (
        <path
          d="M19 66c4-15 13-23 25-23s21 8 25 23c-11 7-39 7-50 0Z"
          fill={isUnknown ? '#E5E7EB' : `${color}35`}
          stroke={color}
          strokeLinejoin="round"
          strokeWidth="4"
        />
      )}
      {isFemale && <path d="M28 27c4-13 28-13 32 0 2 7 6 14 10 18-10 2-42 2-52 0 4-4 8-11 10-18Z" fill={color} opacity="0.72" />}
      {kind === 'male' && <path d="M28 22c7-10 25-12 34 0-1 6-4 11-8 14-5-6-13-8-24-5-2-3-3-6-2-9Z" fill={color} opacity="0.72" />}
      {isUnknown && <text x="44" y="34" textAnchor="middle" className="fill-slate-500 text-2xl font-black">?</text>}
    </svg>
  );
}

function SexCard({
  kind,
  label,
  employees,
  total,
}: {
  kind: SexKind;
  label: string;
  employees: number;
  total: number;
}) {
  const color = sexColors[kind];
  const percentage = percent(employees, total);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
      <div className="mx-auto flex h-20 items-center justify-center">
        <SexAvatar kind={kind} color={color} />
      </div>
      <div className="mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: color }}>
        {percentage}%
      </div>
      <p className="mt-2 text-sm font-black uppercase tracking-wide text-slate-950">{label}</p>
      <p className="text-xs font-semibold text-slate-500">{employees} empleados</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
        <span className="rounded-md bg-slate-50 px-2 py-1">{employees} emp.</span>
        <span className="rounded-md bg-slate-50 px-2 py-1">{percentage}%</span>
      </div>
    </div>
  );
}

export function BiologicalSexInfographic({ kpis, isLoading }: BiologicalSexInfographicProps) {
  if (isLoading) {
    return (
      <div className="card-elevated p-5">
        <Skeleton className="mb-4 h-6 w-44" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-52 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const male = kpis?.byGender.male || 0;
  const female = kpis?.byGender.female || 0;
  const unknown = Math.max((kpis?.totalActiveEmployees || 0) - male - female, 0);
  const total = Math.max(kpis?.totalActiveEmployees || 0, male + female + unknown);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-full rounded-xl border border-slate-200 bg-[#FBFAF5] p-5 shadow-sm"
    >
      <div className="mb-4 flex items-start gap-2">
        <UsersRound className="mt-0.5 h-4 w-4 text-slate-700" />
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-950">Sexo biologico</h3>
          <p className="text-xs font-medium text-slate-500">Distribucion por empleados activos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <SexCard kind="female" label="Femenino" employees={female} total={total} />
        <SexCard kind="male" label="Masculino" employees={male} total={total} />
        <SexCard kind="unknown" label="Sin dato" employees={unknown} total={total} />
      </div>
    </motion.div>
  );
}
