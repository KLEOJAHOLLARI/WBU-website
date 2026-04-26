import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TEMPLATES, applyOverride, DOC_TYPE_LABEL, type TemplateVariable, type DocumentTemplate } from "@/lib/documentTemplates";
import { FileSignature, RotateCcw, Save, Plus, Trash2, GripVertical } from "lucide-react";

interface OverrideRow {
  id?: string;
  template_key: string;
  display_name: string | null;
  description: string | null;
  variables: TemplateVariable[];
}

const VAR_TYPES: TemplateVariable["type"][] = ["text", "textarea", "date"];
const VAR_SOURCES: NonNullable<TemplateVariable["source"]>[] = ["student", "input", "auto"];

const AdminDocumentTemplates = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string>(TEMPLATES[0].key);
  const [draft, setDraft] = useState<OverrideRow | null>(null);

  const { data: overrides = [] } = useQuery({
    queryKey: ["doc-template-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_template_overrides").select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const baseTemplate = useMemo<DocumentTemplate>(
    () => TEMPLATES.find(t => t.key === selectedKey)!,
    [selectedKey],
  );
  const existingOverride = useMemo(
    () => overrides.find(o => o.template_key === selectedKey),
    [overrides, selectedKey],
  );

  // Effective (merged) preview
  const effective = useMemo(
    () => applyOverride(baseTemplate, draft as any),
    [baseTemplate, draft],
  );

  // Load draft when template selection changes
  useEffect(() => {
    if (existingOverride) {
      setDraft({
        id: existingOverride.id,
        template_key: selectedKey,
        display_name: existingOverride.display_name ?? "",
        description: existingOverride.description ?? "",
        variables: (existingOverride.variables as TemplateVariable[]) ?? [...baseTemplate.variables],
      });
    } else {
      setDraft({
        template_key: selectedKey,
        display_name: baseTemplate.name,
        description: baseTemplate.description,
        variables: baseTemplate.variables.map(v => ({ ...v })),
      });
    }
  }, [selectedKey, existingOverride, baseTemplate]);

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const payload = {
        template_key: draft.template_key,
        display_name: draft.display_name?.trim() || null,
        description: draft.description?.trim() || null,
        variables: draft.variables,
        updated_by: user?.id ?? null,
      };
      const { error } = await supabase
        .from("document_template_overrides")
        .upsert(payload, { onConflict: "template_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doc-template-overrides"] });
      toast({ title: "Saved", description: "Template fields updated." });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const reset = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("document_template_overrides")
        .delete()
        .eq("template_key", selectedKey);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doc-template-overrides"] });
      toast({ title: "Reset", description: "Template restored to defaults." });
    },
    onError: (e: any) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  const updateVar = (idx: number, patch: Partial<TemplateVariable>) => {
    if (!draft) return;
    const next = [...draft.variables];
    next[idx] = { ...next[idx], ...patch };
    setDraft({ ...draft, variables: next });
  };
  const removeVar = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, variables: draft.variables.filter((_, i) => i !== idx) });
  };
  const addVar = () => {
    if (!draft) return;
    const key = `field_${draft.variables.length + 1}`;
    setDraft({
      ...draft,
      variables: [...draft.variables, { key, label: "New Field", type: "text", source: "input", required: false, defaultValue: "" }],
    });
  };
  const moveVar = (idx: number, dir: -1 | 1) => {
    if (!draft) return;
    const next = [...draft.variables];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setDraft({ ...draft, variables: next });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSignature className="h-6 w-6" /> Template Fields
            </h1>
            <p className="text-muted-foreground text-sm">Customize titles, default texts, and required variables for each document template.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => reset.mutate()} disabled={!existingOverride || reset.isPending}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset to defaults
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !draft}>
              <Save className="h-4 w-4 mr-2" /> Save changes
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Template list */}
          <Card className="p-3 h-fit">
            <div className="text-xs uppercase font-semibold text-muted-foreground px-2 py-1">Templates</div>
            <div className="space-y-1">
              {TEMPLATES.map(t => {
                const isOverridden = overrides.some(o => o.template_key === t.key);
                const active = t.key === selectedKey;
                return (
                  <button
                    key={t.key}
                    onClick={() => setSelectedKey(t.key)}
                    className={`w-full text-left p-2 rounded-md text-sm transition-colors flex items-center justify-between gap-2 ${
                      active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t.name}</div>
                      <div className={`text-xs truncate ${active ? "opacity-80" : "text-muted-foreground"}`}>
                        {DOC_TYPE_LABEL[t.type]}
                      </div>
                    </div>
                    {isOverridden && <Badge variant={active ? "secondary" : "default"} className="shrink-0">edited</Badge>}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Editor */}
          {draft && (
            <div className="space-y-6">
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Header</h2>
                  <Badge variant="outline">{baseTemplate.key}</Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Display Name</Label>
                    <Input
                      value={draft.display_name ?? ""}
                      onChange={e => setDraft({ ...draft, display_name: e.target.value })}
                      placeholder={baseTemplate.name}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input
                      value={draft.description ?? ""}
                      onChange={e => setDraft({ ...draft, description: e.target.value })}
                      placeholder={baseTemplate.description}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Effective name shown in Document Generator: <span className="font-medium text-foreground">{effective.name}</span>
                </p>
              </Card>

              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Variables</h2>
                    <p className="text-xs text-muted-foreground">Edit labels, defaults, types, source and required state. Reorder as needed.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={addVar}><Plus className="h-4 w-4 mr-1" /> Add field</Button>
                </div>

                <div className="space-y-3">
                  {draft.variables.map((v, idx) => (
                    <div key={`${v.key}-${idx}`} className="border rounded-lg p-3 bg-muted/20">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex flex-col">
                          <button onClick={() => moveVar(idx, -1)} className="text-muted-foreground hover:text-foreground p-0.5"><GripVertical className="h-3 w-3" /></button>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">{v.key}</Badge>
                        <div className="flex-1" />
                        <Button size="icon" variant="ghost" onClick={() => removeVar(idx)} className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>

                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Key</Label>
                          <Input value={v.key} onChange={e => updateVar(idx, { key: e.target.value.replace(/\s+/g, "_") })} className="h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Label</Label>
                          <Input value={v.label} onChange={e => updateVar(idx, { label: e.target.value })} className="h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select value={v.type ?? "text"} onValueChange={val => updateVar(idx, { type: val as any })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {VAR_TYPES.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Source</Label>
                          <Select value={v.source ?? "input"} onValueChange={val => updateVar(idx, { source: val as any })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {VAR_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                          <Label className="text-xs">Default Value</Label>
                          {v.type === "textarea" ? (
                            <Textarea
                              value={v.defaultValue ?? ""}
                              onChange={e => updateVar(idx, { defaultValue: e.target.value })}
                              rows={2}
                            />
                          ) : (
                            <Input
                              value={v.defaultValue ?? ""}
                              onChange={e => updateVar(idx, { defaultValue: e.target.value })}
                              type={v.type === "date" ? "date" : "text"}
                              className="h-8"
                            />
                          )}
                        </div>
                        <div className="flex items-end gap-2 pb-1">
                          <div className="flex items-center gap-2">
                            <Switch checked={!!v.required} onCheckedChange={c => updateVar(idx, { required: c })} />
                            <Label className="text-xs">Required</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {draft.variables.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
                      No fields defined. Click "Add field" to create one.
                    </div>
                  )}
                </div>

                <Separator />
                <div className="text-xs text-muted-foreground">
                  Tip: Variables with source <code className="font-mono">student</code> auto-fill from the selected student in the Document Generator.
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDocumentTemplates;
