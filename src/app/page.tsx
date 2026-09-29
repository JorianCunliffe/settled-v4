import LandingPage from "@/components/landing/LandingPage";

export const metadata = {
  title: "Settled | Every step of the sale, in one place",
  description:
    "Settled guides home sellers and their agents through every step of the sale, from the first conversation to settlement.",
};

// Demo vs live is read from the environment at request time.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <LandingPage />;
}
