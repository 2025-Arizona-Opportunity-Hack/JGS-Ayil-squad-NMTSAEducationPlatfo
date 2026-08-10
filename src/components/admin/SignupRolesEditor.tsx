import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SignupRoleDraft {
  id: string;
  label: string;
  description: string;
  baseRole: "client" | "parent";
}

/**
 * Admin editor for the "I am a..." choices new users see at signup
 * (siteSettings.signupRoles). Labels are cosmetic; every option maps to one
 * of the two self-assignable permission roles (client/parent) — privileged
 * roles still require invite codes.
 */
export function SignupRolesEditor() {
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);
  const updateSiteSettings = useMutation(api.siteSettings.updateSiteSettings);

  const [draft, setDraft] = useState<SignupRoleDraft[] | null>(null);
  const [saving, setSaving] = useState(false);

  const configured = siteSettings?.signupRoles ?? [];
  const editing = draft !== null;

  // Leaving edit mode (or fresh settings) resets any stale draft.
  useEffect(() => {
    setDraft(null);
  }, [siteSettings?.signupRoles]);

  const startEditing = () => {
    setDraft(
      configured.length > 0
        ? configured.map((r) => ({
            id: r.id,
            label: r.label,
            description: r.description ?? "",
            baseRole: r.baseRole,
          }))
        : [
            { id: crypto.randomUUID(), label: "Client", description: "", baseRole: "client" },
            { id: crypto.randomUUID(), label: "Parent", description: "", baseRole: "parent" },
          ]
    );
  };

  const updateRow = (index: number, patch: Partial<SignupRoleDraft>) => {
    setDraft((rows) =>
      rows ? rows.map((r, i) => (i === index ? { ...r, ...patch } : r)) : rows
    );
  };

  const save = async (roles: SignupRoleDraft[]) => {
    setSaving(true);
    try {
      await updateSiteSettings({
        signupRoles: roles.map((r) => ({
          id: r.id,
          label: r.label.trim(),
          description: r.description.trim() || undefined,
          baseRole: r.baseRole,
        })),
      });
      toast.success(
        roles.length === 0
          ? "Signup roles reset to defaults"
          : "Signup roles saved"
      );
      setDraft(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save signup roles"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!siteSettings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Signup Roles
        </CardTitle>
        <CardDescription>
          The choices new users see under "I am a..." when creating a profile.
          Labels are shown throughout the app; each option grants only
          standard (client) or parent permissions — privileged roles still
          require an invite code.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editing && (
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {configured.length > 0
                ? `Custom roles: ${configured.map((r) => r.label).join(", ")}`
                : "Using the built-in defaults: Client, Parent"}
            </p>
            <Button variant="outline" onClick={startEditing}>
              Customize
            </Button>
          </div>
        )}

        {editing && draft && (
          <div className="space-y-4">
            {draft.map((role, index) => (
              <div
                key={role.id}
                className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto_auto] items-end border rounded-md p-3"
              >
                <div className="space-y-1">
                  <Label htmlFor={`role-label-${role.id}`}>Label</Label>
                  <Input
                    id={`role-label-${role.id}`}
                    value={role.label}
                    maxLength={60}
                    placeholder="e.g. Mentor"
                    onChange={(e) => updateRow(index, { label: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`role-desc-${role.id}`}>
                    Description (optional)
                  </Label>
                  <Input
                    id={`role-desc-${role.id}`}
                    value={role.description}
                    maxLength={200}
                    placeholder="Shown when this role is selected"
                    onChange={(e) =>
                      updateRow(index, { description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`role-base-${role.id}`}>Permissions</Label>
                  <Select
                    value={role.baseRole}
                    onValueChange={(value: "client" | "parent") =>
                      updateRow(index, { baseRole: value })
                    }
                  >
                    <SelectTrigger id={`role-base-${role.id}`} className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Standard</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${role.label || "role"}`}
                  disabled={draft.length <= 1}
                  onClick={() =>
                    setDraft((rows) =>
                      rows ? rows.filter((_, i) => i !== index) : rows
                    )
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              disabled={draft.length >= 20}
              onClick={() =>
                setDraft((rows) =>
                  rows
                    ? [
                        ...rows,
                        {
                          id: crypto.randomUUID(),
                          label: "",
                          description: "",
                          baseRole: "client",
                        },
                      ]
                    : rows
                )
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Add role
            </Button>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={() => void save(draft)}
                disabled={saving || draft.some((r) => !r.label.trim())}
              >
                {saving ? "Saving..." : "Save signup roles"}
              </Button>
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => setDraft(null)}
              >
                Cancel
              </Button>
              {configured.length > 0 && (
                <Button
                  variant="ghost"
                  disabled={saving}
                  onClick={() => void save([])}
                >
                  Reset to defaults
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
