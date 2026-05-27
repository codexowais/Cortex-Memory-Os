import { CortexDashboard } from "@/components/cortex-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Home() {
  return <CortexDashboard />;
}
