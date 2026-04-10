import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  dataDictionary,
  TABLE_CATEGORIES,
  CATEGORY_COLORS,
  type DataDictionaryTable,
  type TableCategory,
} from '@/data/data-dictionary';
import { Badge } from '@/components/ui/badge';
import { Key, ArrowRight } from 'lucide-react';

// Category colors for node borders/headers (HSL-based for theming)
const CATEGORY_NODE_COLORS: Record<TableCategory, { bg: string; border: string; text: string }> = {
  'Core Academic': { bg: 'hsl(217 91% 60% / 0.08)', border: 'hsl(217 91% 60% / 0.4)', text: 'hsl(217 91% 60%)' },
  'Scheduling': { bg: 'hsl(160 84% 39% / 0.08)', border: 'hsl(160 84% 39% / 0.4)', text: 'hsl(160 84% 39%)' },
  'AI & Chat': { bg: 'hsl(263 70% 50% / 0.08)', border: 'hsl(263 70% 50% / 0.4)', text: 'hsl(263 70% 50%)' },
  'Google Integration': { bg: 'hsl(38 92% 50% / 0.08)', border: 'hsl(38 92% 50% / 0.4)', text: 'hsl(38 92% 50%)' },
  'Security & Audit': { bg: 'hsl(0 84% 60% / 0.08)', border: 'hsl(0 84% 60% / 0.4)', text: 'hsl(0 84% 60%)' },
  'Marketplace': { bg: 'hsl(330 81% 60% / 0.08)', border: 'hsl(330 81% 60% / 0.4)', text: 'hsl(330 81% 60%)' },
  'Sync & Offline': { bg: 'hsl(187 92% 50% / 0.08)', border: 'hsl(187 92% 50% / 0.4)', text: 'hsl(187 92% 50%)' },
  'Notifications': { bg: 'hsl(25 95% 53% / 0.08)', border: 'hsl(25 95% 53% / 0.4)', text: 'hsl(25 95% 53%)' },
  'Analytics': { bg: 'hsl(239 84% 67% / 0.08)', border: 'hsl(239 84% 67% / 0.4)', text: 'hsl(239 84% 67%)' },
};

interface TableNodeData {
  table: DataDictionaryTable;
  colors: { bg: string; border: string; text: string };
  [key: string]: unknown;
}

function TableNode({ data }: { data: TableNodeData }) {
  const { table, colors } = data;
  const pkFields = table.fields.filter(f => f.constraints.some(c => c.toLowerCase().includes('primary')));
  const fkFields = table.fields.filter(f => f.constraints.some(c => c.toLowerCase().includes('foreign')));
  const otherFields = table.fields.filter(
    f => !f.constraints.some(c => c.toLowerCase().includes('primary')) &&
         !f.constraints.some(c => c.toLowerCase().includes('foreign'))
  );

  return (
    <div
      className="rounded-lg shadow-lg overflow-hidden min-w-[220px] max-w-[280px]"
      style={{
        border: `2px solid ${colors.border}`,
        background: 'hsl(var(--card))',
      }}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-primary" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-primary" />

      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between gap-2"
        style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}
      >
        <span className="text-xs font-bold truncate" style={{ color: colors.text }}>
          {table.displayName}
        </span>
        <span className="text-[9px] font-mono opacity-60 shrink-0" style={{ color: colors.text }}>
          {table.fields.length}f
        </span>
      </div>

      {/* Fields */}
      <div className="text-[10px] divide-y divide-border/30">
        {pkFields.map(f => (
          <div key={f.name} className="px-3 py-1 flex items-center gap-1.5 bg-primary/5">
            <Key className="w-2.5 h-2.5 text-amber-500 shrink-0" />
            <span className="font-mono font-semibold text-foreground truncate">{f.name}</span>
            <span className="text-muted-foreground ml-auto shrink-0">{f.type}</span>
          </div>
        ))}
        {fkFields.map(f => (
          <div key={f.name} className="px-3 py-1 flex items-center gap-1.5 bg-muted/20">
            <ArrowRight className="w-2.5 h-2.5 text-primary/60 shrink-0" />
            <span className="font-mono text-foreground/80 truncate">{f.name}</span>
            <span className="text-muted-foreground ml-auto shrink-0">{f.type}</span>
          </div>
        ))}
        {otherFields.length > 0 && (
          <div className="px-3 py-1 text-muted-foreground italic">
            +{otherFields.length} more fields
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { tableNode: TableNode };

function buildLayout(tables: DataDictionaryTable[]): { nodes: Node[]; edges: Edge[] } {
  // Group tables by category for a structured layout
  const grouped: Record<string, DataDictionaryTable[]> = {};
  for (const cat of TABLE_CATEGORIES) grouped[cat] = [];
  for (const t of tables) grouped[t.category].push(t);

  const nodes: Node[] = [];
  let yOffset = 0;

  for (const cat of TABLE_CATEGORIES) {
    const catTables = grouped[cat];
    if (catTables.length === 0) continue;

    const cols = 3;
    const colWidth = 320;
    const rowHeight = 200;

    catTables.forEach((table, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      nodes.push({
        id: table.name,
        type: 'tableNode',
        position: { x: col * colWidth, y: yOffset + row * rowHeight },
        data: {
          table,
          colors: CATEGORY_NODE_COLORS[table.category],
        },
      });
    });

    const catRows = Math.ceil(catTables.length / cols);
    yOffset += catRows * rowHeight + 80;
  }

  // Build edges from relationships
  const tableNames = new Set(tables.map(t => t.name));
  const edges: Edge[] = [];
  const seenEdges = new Set<string>();

  for (const table of tables) {
    for (const rel of table.relationships) {
      if (!tableNames.has(rel.table)) continue;
      const edgeId = [table.name, rel.table].sort().join('--');
      if (seenEdges.has(edgeId)) continue;
      seenEdges.add(edgeId);

      edges.push({
        id: edgeId,
        source: table.name,
        target: rel.table,
        type: 'smoothstep',
        animated: false,
        label: rel.via,
        labelStyle: { fontSize: 9, fill: 'hsl(var(--muted-foreground))' },
        labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        style: { stroke: 'hsl(var(--primary) / 0.3)', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary) / 0.5)', width: 12, height: 12 },
      });
    }
  }

  return { nodes, edges };
}

interface SchemaERDiagramProps {
  onTableSelect?: (tableName: string) => void;
}

export default function SchemaERDiagram({ onTableSelect }: SchemaERDiagramProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildLayout(dataDictionary),
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onTableSelect?.(node.id);
    },
    [onTableSelect]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="hsl(var(--border) / 0.3)" />
        <Controls className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted" />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as TableNodeData;
            return data?.colors?.border ?? 'hsl(var(--primary))';
          }}
          className="!bg-card !border-border"
          maskColor="hsl(var(--background) / 0.7)"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-card/95 border border-border/50 backdrop-blur-sm shadow-lg">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Categories
        </p>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1">
          {TABLE_CATEGORIES.map((cat) => {
            const c = CATEGORY_NODE_COLORS[cat];
            return (
              <div key={cat} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: c.border }}
                />
                <span className="text-[10px] text-muted-foreground">{cat}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
