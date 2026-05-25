import { DotLoader } from "@/components/ui/dot-loader";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <DotLoader label="Loading" className="text-base" />
    </div>
  );
}
