import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2, Download, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  recordCount?: number;
  isLoading?: boolean;
  onExportExcel: () => void;
  onExportPDF: () => void;
  children?: React.ReactNode;
  className?: string;
  headerExtra?: React.ReactNode;
}

export function ReportCard({
  title,
  description,
  icon,
  recordCount,
  isLoading,
  onExportExcel,
  onExportPDF,
  children,
  className,
  headerExtra,
}: ReportCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className={cn('group relative', className)}
    >
      <Card className="overflow-hidden rounded-[2.5rem] border-border/50 bg-background/50 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] group-hover:border-primary/20">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500 pointer-events-none">
          <div className="scale-[4] transform rotate-12">
            {icon}
          </div>
        </div>

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner">
                  {icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black tracking-tight text-foreground uppercase leading-tight sm:text-xl">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground line-clamp-2">
                    {description}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col items-end shrink-0">
                {headerExtra}
                {recordCount !== undefined && (
                  <div className="text-right">
                    <span className="text-2xl font-black text-primary sm:text-3xl leading-none">{recordCount}</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">registros</p>
                  </div>
                )}
              </div>
            </div>

            {children && (
              <div className="relative rounded-2xl bg-muted/30 p-4 border border-border/40">
                {children}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button
                variant="outline"
                size="lg"
                className="group/btn relative h-14 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary overflow-hidden"
                onClick={onExportExcel}
                disabled={isLoading || recordCount === 0}
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Excel</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="group/btn relative h-14 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary overflow-hidden"
                onClick={onExportPDF}
                disabled={isLoading || recordCount === 0}
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">PDF</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
