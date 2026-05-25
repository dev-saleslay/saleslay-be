"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DotLoader } from "@/components/ui/dot-loader";

type CompanyProfileFormData = {
  companyName: string;
  website: string;
  industry: string;
  companySize: string;
  productName: string;
  productCategory: string;
  targetAudience: string;
  productDescription: string;
  uniqueValue: string;
  pricing: string;
  notes: string;
};

const initialData: CompanyProfileFormData = {
  companyName: "",
  website: "",
  industry: "",
  companySize: "",
  productName: "",
  productCategory: "",
  targetAudience: "",
  productDescription: "",
  uniqueValue: "",
  pricing: "",
  notes: "",
};

const formKeys = Object.keys(initialData) as (keyof CompanyProfileFormData)[];

function sameProfile(a: CompanyProfileFormData, b: CompanyProfileFormData): boolean {
  return formKeys.every((k) => a[k] === b[k]);
}

export function CompanyProductForm() {
  const [formData, setFormData] = useState<CompanyProfileFormData>(initialData);
  /** Last loaded or successfully saved snapshot — Save stays off until the user edits. */
  const [baseline, setBaseline] = useState<CompanyProfileFormData | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(() => {
    if (baseline === null || isLoadingCompany) return false;
    return !sameProfile(formData, baseline);
  }, [formData, baseline, isLoadingCompany]);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const response = await fetch("/api/settings/company", { cache: "no-store" });
        const data = (await response.json()) as { company?: Partial<CompanyProfileFormData>; error?: string };
        if (!response.ok || !data.company) {
          throw new Error(data.error || "Failed to load company profile");
        }
        const merged = { ...initialData, ...data.company };
        setFormData(merged);
        setBaseline(merged);
        setStatusMessage("");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Failed to load company profile.");
        setBaseline({ ...initialData });
      } finally {
        setIsLoadingCompany(false);
      }
    };

    void loadCompany();
  }, []);

  const onChange =
    (field: keyof CompanyProfileFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch("/api/settings/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save company profile.");
      }
      setBaseline({ ...formData });
      setStatusMessage("Saved successfully.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save company profile.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoadingCompany) {
    return (
      <div className="space-y-6">
        <section className="flex min-h-[min(60vh,520px)] flex-col items-center justify-center rounded-xl border bg-card p-8 shadow-sm sm:p-12">
          <DotLoader label="Loading your company profile…" />
          <p className="mt-4 text-center text-sm text-muted-foreground">Fetching your saved details.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">My Company</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your company and product information here so your account profile stays complete.
        </p>
      </section>

      <form onSubmit={onSave} className="space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Company details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Company name</label>
            <Input value={formData.companyName} onChange={onChange("companyName")} placeholder="Legal or brand name" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Website</label>
            <Input value={formData.website} onChange={onChange("website")} placeholder="https://yourcompany.com" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Industry</label>
            <Input value={formData.industry} onChange={onChange("industry")} placeholder="SaaS, E-commerce, Healthcare..." />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Company size</label>
            <Input value={formData.companySize} onChange={onChange("companySize")} placeholder="1-10, 10-50, 50-200..." />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Product details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Product name</label>
              <Input value={formData.productName} onChange={onChange("productName")} placeholder="Product or service name" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Product category</label>
              <Input value={formData.productCategory} onChange={onChange("productCategory")} placeholder="CRM / Automation" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Target audience</label>
            <Input value={formData.targetAudience} onChange={onChange("targetAudience")} placeholder="SMBs, agencies, enterprise..." />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Product description</label>
            <Textarea
              value={formData.productDescription}
              onChange={onChange("productDescription")}
              placeholder="Briefly explain what your product does."
              className="min-h-24"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Unique value proposition</label>
            <Textarea
              value={formData.uniqueValue}
              onChange={onChange("uniqueValue")}
              placeholder="Why customers should choose your product."
              className="min-h-20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Pricing info</label>
            <Input value={formData.pricing} onChange={onChange("pricing")} placeholder="$29/mo starter, custom enterprise..." />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={onChange("notes")}
              placeholder="Any extra information about your company or product."
              className="min-h-20"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {statusMessage ||
              (isDirty ? "You have unsaved changes." : "Update any field to enable Save.")}
          </p>
          <Button type="submit" disabled={saving || isLoadingCompany || !isDirty}>
            {saving ? "Saving..." : "Save information"}
          </Button>
        </CardFooter>
      </Card>
    </form>
    </div>
  );
}
