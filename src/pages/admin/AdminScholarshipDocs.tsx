import { useEffect, useState } from "react";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  SCHOLARSHIP_NAMES,
  SCHOLARSHIP_DOCS_KEY,
  DEFAULT_SCHOLARSHIP_DOCS,
  fetchScholarshipDocs,
  type ScholarshipDocsValue,
} from "@/lib/scholarshipDocs";

const ListEditor = ({
  title,
  items,
  onChange,
}: {
  title: string;
  items: string[];
  onChange: (next: string[]) => void;
}) => {
  const update = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents. Click “Add” to create one.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((doc, i) => (
            <li key={i} className="flex items-center gap-2">
              <Input
                value={doc}
                onChange={(e) => update(i, e.target.value)}
                placeholder="Document description"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => remove(i)}
                aria-label="Remove document"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

const AdminScholarshipDocs = () => {
  const [value, setValue] = useState<ScholarshipDocsValue>(DEFAULT_SCHOLARSHIP_DOCS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchScholarshipDocs()
      .then(setValue)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    // strip empty strings
    const cleaned: ScholarshipDocsValue = {
      base: value.base.map((s) => s.trim()).filter(Boolean),
      extra: Object.fromEntries(
        Object.entries(value.extra).map(([k, arr]) => [
          k,
          arr.map((s) => s.trim()).filter(Boolean),
        ])
      ),
    };

    const { data: existing } = await supabase
      .from("system_settings")
      .select("id")
      .eq("key", SCHOLARSHIP_DOCS_KEY)
      .maybeSingle();

    const { error } = existing
      ? await supabase
          .from("system_settings")
          .update({ value: cleaned as any })
          .eq("id", existing.id)
      : await supabase
          .from("system_settings")
          .insert({ key: SCHOLARSHIP_DOCS_KEY, value: cleaned as any });

    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    } else {
      setValue(cleaned);
      toast({ title: "Saved", description: "Scholarship documents updated." });
    }
  };

  const resetDefaults = () => setValue(DEFAULT_SCHOLARSHIP_DOCS);

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Scholarship Documents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit the base required documents and the extra documents for each scholarship.
            These power the downloadable PDF checklists on the public Scholarships page.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetDefaults} disabled={loading || saving}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to defaults
          </Button>
          <Button onClick={save} disabled={loading || saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-5">
          <ListEditor
            title="Base documents (apply to every scholarship)"
            items={value.base}
            onChange={(next) => setValue((v) => ({ ...v, base: next }))}
          />

          {SCHOLARSHIP_NAMES.map((name) => (
            <ListEditor
              key={name}
              title={`Extra documents — ${name}`}
              items={value.extra[name] || []}
              onChange={(next) =>
                setValue((v) => ({ ...v, extra: { ...v.extra, [name]: next } }))
              }
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminScholarshipDocs;
