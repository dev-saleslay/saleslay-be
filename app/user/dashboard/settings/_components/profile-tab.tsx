"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DotLoader } from "@/components/ui/dot-loader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProfileFormData = {
  fullName: string;
  phone: string;
  role: string;
  location: string;
  about: string;
  linkedinUrl: string;
  website: string;
  email: string;
  image: string;
};

const initialFormData: ProfileFormData = {
  fullName: "",
  phone: "",
  role: "",
  location: "",
  about: "",
  linkedinUrl: "",
  website: "",
  email: "",
  image: "",
};

function toEditablePayload(data: ProfileFormData) {
  return {
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    role: data.role.trim(),
    location: data.location.trim(),
    about: data.about.trim(),
    linkedinUrl: data.linkedinUrl.trim(),
    website: data.website.trim(),
  };
}

export function ProfileTab() {
  const { data: session } = useSession();
  const [formData, setFormData] = useState<ProfileFormData>(initialFormData);
  const [initialEditableData, setInitialEditableData] = useState(() => toEditablePayload(initialFormData));
  const [saving, setSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Loading profile...");

  const userName = formData.fullName || session?.user?.name?.trim() || "User";
  const userEmail = formData.email || session?.user?.email?.trim() || "No email";
  const userImage = formData.image || session?.user?.image || undefined;
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/settings/profile", { cache: "no-store" });
        const data = (await response.json()) as { profile?: Partial<ProfileFormData>; error?: string };
        if (!response.ok || !data.profile) {
          throw new Error(data.error || "Failed to load profile");
        }
        const nextFormData = { ...initialFormData, ...data.profile };
        setFormData(nextFormData);
        setInitialEditableData(toEditablePayload(nextFormData));
        setStatusMessage("Profile loaded.");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Failed to load profile.");
      } finally {
        setIsLoadingProfile(false);
      }
    };

    void loadProfile();
  }, []);

  const onChange =
    (field: keyof ProfileFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const editablePayload = toEditablePayload(formData);
  const isDirty = JSON.stringify(editablePayload) !== JSON.stringify(initialEditableData);

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || saving) {
      return;
    }
    setSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editablePayload),
      });

      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save profile.");
      }
      setInitialEditableData(editablePayload);
      setStatusMessage("Profile saved successfully.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSave}>
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
          <CardDescription>Manage your account details and personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingProfile ? (
            <DotLoader label="Loading profile data" />
          ) : (
            <>
              <section className="flex items-center gap-4">
                <Avatar size="lg" className="size-14 rounded-full">
                  <AvatarImage src={userImage} alt={userName} />
                  <AvatarFallback>{initials || "U"}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{userName}</p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Full name</label>
                  <Input value={formData.fullName} onChange={onChange("fullName")} placeholder="Your full name" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={formData.email} disabled placeholder="—" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={formData.phone} onChange={onChange("phone")} placeholder="Phone (optional)" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Role</label>
                  <Input value={formData.role} onChange={onChange("role")} placeholder="Founder, Marketer..." />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Location</label>
                  <Input value={formData.location} onChange={onChange("location")} placeholder="City, Country" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Website</label>
                  <Input value={formData.website} onChange={onChange("website")} placeholder="https://yourwebsite.com" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium">LinkedIn URL</label>
                  <Input
                    value={formData.linkedinUrl}
                    onChange={onChange("linkedinUrl")}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium">About yourself</label>
                  <Textarea
                    value={formData.about}
                    onChange={onChange("about")}
                    placeholder="Tell us about yourself, your work, and your goals."
                    className="min-h-24"
                  />
                </div>
              </section>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{statusMessage}</p>
                <Button type="submit" disabled={saving || !isDirty}>
                  {saving ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
