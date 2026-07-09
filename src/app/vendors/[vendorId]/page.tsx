import VendorProfilePage from "@/components/vendors/VendorProfilePage";
import { findVendorById } from "@/lib/stage-content-db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settled | Vendor",
};

export default async function VendorPage({ params }: { params: { vendorId: string } }) {
  const lookup = await findVendorById(params.vendorId);

  if (!lookup) {
    notFound();
  }

  return (
    <VendorProfilePage
      vendor={lookup.vendor}
      service={lookup.service}
      stageLabel={lookup.stageLabel}
    />
  );
}
