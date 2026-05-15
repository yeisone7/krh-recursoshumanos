/**
 * AsistenteIA.tsx
 * Página principal del Asistente IA con dos modos:
 *  - "Análisis de Datos": chat IA sobre datos internos (DataAssistantChat) — PRIMERO
 *  - "Asistente de Ayuda": chat contextual de uso de la app (AiChatPanel)
 */
import { useState } from 'react';
import { MessageCircle, BarChart2 } from 'lucide-react';
import { AiChatPanel } from '@/components/ai/AiChatPanel';
import { DataAssistantChat } from '@/components/ai/DataAssistantChat';

type Tab = 'data' | 'help';

export default function AsistenteIA() {
  const [activeTab, setActiveTab] = useState<Tab>('data');

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Tab selector */}
      <div className="flex shrink-0 border-b bg-background px-4 pt-3 gap-1">
        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg
            transition-colors border-b-2 -mb-px
            ${activeTab === 'data'
              ? 'border-primary text-primary '
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-background'
            }`}
        >
          <BarChart2 className="w-4 h-4" />
          Análisis de Datos
          <span className="ml-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-semibold leading-none">
            IA
          </span>
        </button>

        <button
          onClick={() => setActiveTab('help')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg
            transition-colors border-b-2 -mb-px
            ${activeTab === 'help'
              ? 'border-primary text-primary '
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-background'
            }`}
        >
          <MessageCircle className="w-4 h-4" />
          Asistente de Ayuda
        </button>
      </div>

      {/* Contenido del tab activo */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'data'
          ? <DataAssistantChat />
          : <AiChatPanel hideTabs />
        }
      </div>
    </div>
  );
}
