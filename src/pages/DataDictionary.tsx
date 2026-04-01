import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin, useDataDictionaryAuth } from '@/hooks/useDataDictionary';
import {
  dataDictionary,
  TABLE_CATEGORIES,
  CATEGORY_COLORS,
  type DataDictionaryTable,
  type TableCategory,
} from '@/data/data-dictionary';
import { exportToExcel, exportToPDF } from '@/lib/data-dictionary-export';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Database,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Shield,
  Table2,
  Layers,
  Clock,
  GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';

const SchemaERDiagram = lazy(() => import('@/components/SchemaERDiagram'));

const ADMIN_EMAIL = 'mohammed.aswath07@gmail.com';

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  user_input: { label: 'User Input', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  system_generated: { label: 'System', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  external_api: { label: 'External API', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

export default function DataDictionary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const { data: authData, isLoading: authLoading, refetch } = useDataDictionaryAuth();

  const [search, setSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('tables');
  const [expandedCategories, setExpandedCategories] = useState<Set<TableCategory>>(
    new Set(TABLE_CATEGORIES)
  );
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleDiagramTableSelect = useCallback((tableName: string) => {
    setSelectedTable(tableName);
    setActiveTab('tables');
  }, []);

  // Redirect non-admins
  useEffect(() => {
    if (user && !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [user, isAdmin, navigate]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    const q = search.toLowerCase();
    return dataDictionary.filter((t) => {
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.displayName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.fields.some(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.description.toLowerCase().includes(q)
        );

      const matchesType =
        typeFilter === 'all' ||
        t.fields.some((f) => f.type.toLowerCase().includes(typeFilter.toLowerCase()));

      return matchesSearch && matchesType;
    });
  }, [search, typeFilter]);

  const selectedTableData = useMemo(
    () => dataDictionary.find((t) => t.name === selectedTable) ?? null,
    [selectedTable]
  );

  // Auto-select first table
  useEffect(() => {
    if (!selectedTable && filteredTables.length > 0) {
      setSelectedTable(filteredTables[0].name);
    }
  }, [filteredTables, selectedTable]);

  const toggleCategory = (cat: TableCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(text);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isAdmin) return null;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  const fieldTypes = ['all', 'uuid', 'text', 'integer', 'numeric', 'boolean', 'timestamptz', 'date', 'time', 'jsonb', 'vector', 'inet'];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Data Dictionary</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Admin-only access
              {authData?.generated_at && (
                <>
                  <span className="mx-1">·</span>
                  <Clock className="w-3 h-3" />
                  Verified {new Date(authData.generated_at).toLocaleTimeString()}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToExcel(dataDictionary)}
            className="gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPDF(dataDictionary, authData?.generated_at)}
            className="gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* Stats Bar + View Tabs */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30 text-sm">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Table2 className="w-4 h-4" />
            <strong className="text-foreground">{dataDictionary.length}</strong> tables
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Layers className="w-4 h-4" />
            <strong className="text-foreground">
              {dataDictionary.reduce((s, t) => s + t.fields.length, 0)}
            </strong>{' '}
            fields
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ArrowRight className="w-4 h-4" />
            <strong className="text-foreground">
              {dataDictionary.reduce((s, t) => s + t.relationships.length, 0)}
            </strong>{' '}
            relationships
          </span>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-8">
            <TabsTrigger value="tables" className="text-xs gap-1.5 h-7 px-3">
              <Table2 className="w-3.5 h-3.5" />
              Tables
            </TabsTrigger>
            <TabsTrigger value="diagram" className="text-xs gap-1.5 h-7 px-3">
              <GitBranch className="w-3.5 h-3.5" />
              Schema Diagram
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'diagram' ? (
        <div className="flex-1 relative">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            }
          >
            <SchemaERDiagram onTableSelect={handleDiagramTableSelect} />
          </Suspense>
        </div>
      ) : (
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r flex flex-col bg-card/30">
          <div className="p-3 space-y-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tables & fields..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm bg-input/50"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {fieldTypes.map((ft) => (
                <button
                  key={ft}
                  onClick={() => setTypeFilter(ft)}
                  className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    typeFilter === ft
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                  }`}
                >
                  {ft === 'all' ? 'All Types' : ft}
                </button>
              ))}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {TABLE_CATEGORIES.map((category) => {
                const catTables = filteredTables.filter((t) => t.category === category);
                if (catTables.length === 0) return null;
                const isExpanded = expandedCategories.has(category);

                return (
                  <div key={category}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      {category}
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                        {catTables.length}
                      </Badge>
                    </button>

                    {isExpanded &&
                      catTables.map((table) => (
                        <button
                          key={table.name}
                          onClick={() => setSelectedTable(table.name)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            selectedTable === table.name
                              ? 'bg-primary/10 text-primary border-l-2 border-primary'
                              : 'hover:bg-muted/50 text-foreground/80'
                          }`}
                        >
                          <div className="font-medium truncate">{table.displayName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {table.name}
                          </div>
                        </button>
                      ))}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1">
          {selectedTableData ? (
            <div className="p-6 space-y-6 max-w-4xl">
              {/* Table Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {selectedTableData.displayName}
                    </h2>
                    <p className="text-sm font-mono text-muted-foreground mt-1">
                      {selectedTableData.name}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={CATEGORY_COLORS[selectedTableData.category]}
                  >
                    {selectedTableData.category}
                  </Badge>
                </div>

                <p className="mt-4 text-foreground/90 leading-relaxed">
                  {selectedTableData.description}
                </p>
                <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Purpose: </span>
                    {selectedTableData.purpose}
                  </p>
                </div>
              </div>

              {/* Relationships */}
              {selectedTableData.relationships.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-primary" />
                      Relationships
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedTableData.relationships.map((rel, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2.5 rounded-md bg-muted/20 border border-border/30"
                      >
                        <Badge variant="outline" className="text-xs font-mono shrink-0">
                          {rel.type}
                        </Badge>
                        <button
                          onClick={() => setSelectedTable(rel.table)}
                          className="font-mono text-sm text-primary hover:underline"
                        >
                          {rel.table}
                        </button>
                        <span className="text-xs text-muted-foreground">via</span>
                        <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">
                          {rel.via}
                        </code>
                        <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
                          {rel.description}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Fields */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Fields
                  <Badge variant="secondary" className="text-xs">
                    {selectedTableData.fields.length}
                  </Badge>
                </h3>

                <div className="space-y-2">
                  {selectedTableData.fields.map((field) => (
                    <Collapsible key={field.name}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/20 transition-colors text-left">
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 collapsible-chevron" />
                          <code className="text-sm font-mono font-semibold text-foreground min-w-[140px]">
                            {field.name}
                          </code>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono shrink-0 bg-muted/30"
                          >
                            {field.type}
                          </Badge>
                          <span className="text-sm text-muted-foreground truncate flex-1">
                            {field.description}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 ${SOURCE_LABELS[field.source]?.color}`}
                          >
                            {SOURCE_LABELS[field.source]?.label}
                          </Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-7 mt-1 p-4 rounded-lg border border-border/30 bg-muted/10 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Example Value
                              </p>
                              <code className="text-sm font-mono text-foreground bg-muted/30 px-2 py-1 rounded inline-block">
                                {field.example}
                              </code>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Data Source
                              </p>
                              <span className="text-sm text-foreground">
                                {SOURCE_LABELS[field.source]?.label}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                              Constraints
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {field.constraints.map((c) => (
                                <Badge
                                  key={c}
                                  variant="outline"
                                  className="text-xs bg-muted/20"
                                >
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(field.name);
                                  }}
                                >
                                  {copiedField === field.name ? (
                                    <Check className="w-3 h-3 mr-1" />
                                  ) : (
                                    <Copy className="w-3 h-3 mr-1" />
                                  )}
                                  Copy field name
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy to clipboard</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a table from the sidebar to view its details</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
