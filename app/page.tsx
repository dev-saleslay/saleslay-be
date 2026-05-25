import { Navbar } from "@/components/main/navbar";
import { LandingPage } from "@/components/landing";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <Navbar />
      <main className="flex-1">
        <LandingPage />
      </main>
    </div>
  );
}
