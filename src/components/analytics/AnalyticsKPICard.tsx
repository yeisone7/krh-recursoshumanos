import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface AnalyticsKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
    inverted?: boolean; // For metrics where lower is better
  };
  href?: string;
  variant?: 'default' | 'primary' | 'accent' | 'warning' | 'destructive' | 'info';
}

export function AnalyticsKPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  href,
  variant = 'default' 
}: AnalyticsKPICardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-3 h-3" />;
    if (trend.value < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    const isPositive = trend.inverted ? trend.value < 0 : trend.value > 0;
    const isNegative = trend.inverted ? trend.value > 0 : trend.value < 0;
    
    if (isPositive) return 'text-success';
    if (isNegative) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const iconBgColors = {
    default: 'bg-muted',
    primary: 'bg-primary/10',
    accent: 'bg-accent/10',
    warning: 'bg-warning/10',
    destructive: 'bg-destructive/10',
    info: 'bg-info/10',
  };

  const iconColors = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    accent: 'text-accent',
    warning: 'text-warning',
    destructive: 'text-destructive',
    info: 'text-info',
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "kpi-card group hover:shadow-card-hover transition-all duration-300",
        href && "cursor-pointer"
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
        <div className="flex flex-col items-end gap-2">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
            iconBgColors[variant]
          )}>
            <span className={iconColors[variant]}>{icon}</span>
          </div>
          {href && (
            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </motion.div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}
