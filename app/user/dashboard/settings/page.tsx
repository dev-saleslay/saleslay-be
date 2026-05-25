"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/app/user/dashboard/settings/_components/profile-tab";
import { AppearanceTab } from "@/app/user/dashboard/settings/_components/appearance-tab";
import { BillingTab } from "@/app/user/dashboard/settings/_components/billing-tab";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your profile, appearance, and billing preferences.
        </p>
      </section>

      <Tabs defaultValue="profile">
        <TabsList className="h-11 rounded-xl p-1">
          <TabsTrigger value="profile" className="h-9 px-5 text-base">
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="h-9 px-5 text-base">
            Appearance
          </TabsTrigger>
          <TabsTrigger value="billing" className="h-9 px-5 text-base">
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>

        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
