import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCreatedListing } from "@/lib/listings";

export const metadata = {
  title: "Listing Details | Settled",
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-AU", {
    currency: "AUD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export default async function DynamicListingPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);

  if (!Number.isInteger(id)) {
    notFound();
  }

  const { listing } = await getCreatedListing(id);

  if (!listing) {
    notFound();
  }

  const gallery = listing.imageUrls?.length
    ? listing.imageUrls
    : listing.carousel_thumb.map((image) => image.img);

  return (
    <main className="listing-details-one theme-details-one bg-pink pt-180 lg-pt-150 pb-150 xl-pb-120">
      <div className="container">
        <div className="row align-items-start">
          <div className="col-lg-7">
            <h3 className="property-titlee">{listing.title}</h3>
            <div className="d-flex flex-wrap mt-10">
              <div className="list-type text-uppercase border-20 mt-15 me-3">
                {listing.tag}
              </div>
              <div className="address mt-15">
                <i className="bi bi-geo-alt"></i> {listing.address}
              </div>
            </div>
          </div>
          <div className="col-lg-5 text-lg-end">
            <div className="price color-dark fw-500">
              Price: {formatPrice(listing.price)}
            </div>
            <Link href="/dashboard/properties-list" className="btn-two mt-25">
              Manage listing
            </Link>
          </div>
        </div>

        <div className="media-gallery mt-60">
          <div className="row">
            <div className="col-lg-8">
              <div className="bg-white border-20 shadow4 p-30">
                <Image
                  src={gallery[0]}
                  alt={listing.title}
                  width={900}
                  height={620}
                  className="w-100 border-20"
                  style={{ maxHeight: 520, objectFit: "cover" }}
                />
              </div>
            </div>
            <div className="col-lg-4">
              <div className="row g-3">
                {gallery.slice(1, 5).map((image) => (
                  <div className="col-6" key={image}>
                    <Image
                      src={image}
                      alt=""
                      width={260}
                      height={260}
                      className="w-100 border-20 bg-white shadow4"
                      style={{ aspectRatio: "1 / 1", objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="property-feature-list bg-white shadow4 border-20 p-40 mt-50 mb-60">
          <h4 className="sub-title-one mb-40 lg-mb-20">Property Overview</h4>
          <ul className="style-none d-flex flex-wrap justify-content-between">
            <li>
              <strong>{listing.property_info.sqft}</strong>
              <span>sqft</span>
            </li>
            <li>
              <strong>{Number(listing.property_info.bed)}</strong>
              <span>bedrooms</span>
            </li>
            <li>
              <strong>{Number(listing.property_info.bath)}</strong>
              <span>bathrooms</span>
            </li>
            <li>
              <strong>{listing.yearBuilt || "TBC"}</strong>
              <span>year built</span>
            </li>
          </ul>
        </div>

        <div className="property-overview mb-50 bg-white shadow4 border-20 p-40">
          <h4 className="mb-20">Overview</h4>
          <p className="fs-20 lh-lg">
            {listing.description ||
              `${listing.title} is listed in ${listing.location}.`}
          </p>
        </div>
      </div>
    </main>
  );
}
