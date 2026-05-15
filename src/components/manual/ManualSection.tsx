import type { ManualContentItem } from '@/data/manualContent';
import { AlertTriangle, Info } from 'lucide-react';

interface Props {
  content: ManualContentItem[];
}

export function ManualSectionRenderer({ content }: Props) {
  return (
    <div className="space-y-4">
      {content.map((item, idx) => (
        <ContentBlock key={idx} item={item} />
      ))}
    </div>
  );
}

function ContentBlock({ item }: { item: ManualContentItem }) {
  switch (item.type) {
    case 'heading':
      return <h3 className="text-base font-semibold text-foreground mt-6 first:mt-0">{item.data}</h3>;

    case 'paragraph':
      return <p className="text-sm text-muted-foreground leading-relaxed">{item.data}</p>;

    case 'list':
      return (
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
          {(item.data as string[]).map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ul>
      );

    case 'table':
      return <DataTable headers={item.data.headers} rows={item.data.rows} />;

    case 'formula':
      return <FormulaBlock data={item.data} />;

    case 'alert':
      return <AlertBlock data={item.data} />;

    default:
      return null;
  }
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background">
            {headers.map((h, i) => (
              <th key={i} className="text-left p-2 font-medium text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t">
              {row.map((cell, ci) => (
                <td key={ci} className="p-2 text-muted-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormulaBlock({ data }: { data: any }) {
  return (
    <div className="rounded-lg border bg-background p-4 space-y-2">
      <p className="font-medium text-sm text-foreground">{data.name}</p>
      <code className="block bg-background rounded px-3 py-2 text-sm font-mono text-primary border">
        {data.formula}
      </code>
      {data.variables && (
        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 ml-2">
          {data.variables.map((v: string, i: number) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      )}
      {data.example && (
        <p className="text-xs text-muted-foreground italic">
          <strong>Ejemplo:</strong> {data.example}
        </p>
      )}
    </div>
  );
}

function AlertBlock({ data }: { data: { variant: string; title: string; message: string } }) {
  const isWarning = data.variant === 'warning';
  return (
    <div
      className={`flex gap-3 rounded-lg border p-3 ${
        isWarning
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-primary/30 '
      }`}
    >
      {isWarning ? (
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      ) : (
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm font-medium text-foreground">{data.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{data.message}</p>
      </div>
    </div>
  );
}
