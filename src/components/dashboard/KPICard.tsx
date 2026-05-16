import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'accent' | 'warning' | 'destructive' | 'info' | 'violet' | 'indigo' | 'teal' | 'rose';
}

export function KPICard({ title, value, subtitle, icon, trend, variant = 'default' }: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-3 h-3" />;
    if (trend.value < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-success';
    if (trend.value < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const iconBgColors = {
    default: 'bg-slate-50',
    primary: 'bg-primary/10',
    secondary: 'bg-secondary/10',
    tertiary: 'bg-tertiary/10',
    accent: 'bg-accent/10',
    warning: 'bg-warning/10',
    destructive: 'bg-destructive/10',
    info: 'bg-info/10',
    violet: 'bg-violet/10',
    indigo: 'bg-indigo/10',
    teal: 'bg-teal/10',
    rose: 'bg-rose/10',
  };

  const iconColors = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    secondary: 'text-secondary',
    tertiary: 'text-tertiary',
    accent: 'text-accent',
    warning: 'text-warning',
    destructive: 'text-destructive',
    info: 'text-info',
    violet: 'text-violet',
    indigo: 'text-indigo',
    teal: 'text-teal',
    rose: 'text-rose',
  };

  const cardBorderAccent = {
    default: '',
    primary: 'border-l-4 border-l-primary',
    secondary: 'border-l-4 border-l-secondary',
    tertiary: 'border-l-4 border-l-tertiary',
    accent: 'border-l-4 border-l-accent',
    warning: 'border-l-4 border-l-warning',
    destructive: 'border-l-4 border-l-destructive',
    info: 'border-l-4 border-l-info',
    violet: 'border-l-4 border-l-violet',
    indigo: 'border-l-4 border-l-indigo',
    teal: 'border-l-4 border-l-teal',
    rose: 'border-l-4 border-l-rose',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "kpi-card group hover:shadow-card-hover transition-shadow duration-300",
        cardBorderAccent[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-display font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn("flex items-center gap-1 mt-2 text-sm font-medium", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
          iconBgColors[variant]
        )}>
          <span className={iconColors[variant]}>{icon}</span>
        </div>
      </div>
    </motion.div>
  );
}