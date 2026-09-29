import LandingPage from "@/components/landing/LandingPage";

export const metadata = {
  title: "Settled | Demo",
  description: "Explore Settled from the seller's side or the agent's side.",
};

export const dynamic = "force-dynamic";

export default function DemoPage() {
  return <LandingPage />;
}
