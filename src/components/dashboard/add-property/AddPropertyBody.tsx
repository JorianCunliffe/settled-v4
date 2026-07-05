"use client"
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo"
import Overview from "./Overview"
import ListingDetails from "./ListingDetails"
import Link from "next/link"
import SelectAmenities from "./SelectAmenities"
import AddressAndLocation from "../profile/AddressAndLocation"
import { FormEvent, useState } from "react"

const AddPropertyBody = () => {
   const [category, setCategory] = useState("Apartments");
   const [listingType, setListingType] = useState("Sell");
   const [bedrooms, setBedrooms] = useState(2);
   const [bathrooms, setBathrooms] = useState(2);
   const [garages, setGarages] = useState(1);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [message, setMessage] = useState<string | null>(null);
   const [error, setError] = useState<string | null>(null);

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const formData = new FormData(event.currentTarget);
      formData.set("category", category);
      formData.set("listingType", listingType);
      formData.set("bedrooms", String(bedrooms));
      formData.set("bathrooms", String(bathrooms));
      formData.set("garages", String(garages));

      try {
         const response = await fetch("/api/listings", {
            method: "POST",
            body: formData,
         });

         if (!response.ok) {
            const payload = (await response.json()) as { message?: string };
            throw new Error(payload.message ?? "Unable to submit property.");
         }

         event.currentTarget.reset();
         setMessage("Property submitted and added to the frontend listing grid.");
      } catch (nextError) {
         setError(nextError instanceof Error ? nextError.message : "Unable to submit property.");
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <div className="dashboard-body">
         <div className="position-relative">
            <DashboardHeaderTwo title="Add New Property" />
            <h2 className="main-title d-block d-lg-none">Add New Property</h2>
            <form onSubmit={handleSubmit}>
            <Overview
               onCategoryChange={(event) => setCategory(event.target.value)}
               onListingTypeChange={(event) => setListingType(event.target.value)}
            />
            <ListingDetails
               onBathroomsChange={(event) => setBathrooms(Number(event.target.value))}
               onBedroomsChange={(event) => setBedrooms(Number(event.target.value))}
               onGaragesChange={(event) => setGarages(Number(event.target.value))}
            />

            <div className="bg-white card-box border-20 mt-40">
               <h4 className="dash-title-three">Photo & Video Attachment</h4>
               <div className="dash-input-wrapper mb-20">
                  <label htmlFor="">File Attachment*</label>

                  <div className="attached-file d-flex align-items-center justify-content-between mb-15">
                     <span>PorpertyImage_01.jpg</span>
                     <Link href="#" className="remove-btn"><i className="bi bi-x"></i></Link>
                  </div>
                  <div className="attached-file d-flex align-items-center justify-content-between mb-15">
                     <span>PorpertyImage_02.jpg</span>
                     <Link href="#" className="remove-btn"><i className="bi bi-x"></i></Link>
                  </div>
               </div>
               <div className="dash-btn-one d-inline-block position-relative me-3">
                  <i className="bi bi-plus"></i>
                  Upload File
                  <input type="file" id="uploadCV" name="images" accept="image/*" multiple placeholder="" />
               </div>
               <small>Upload file .jpg, .png, .mp4</small>
            </div>
            <SelectAmenities />
            <AddressAndLocation formMode />

            <div className="button-group d-inline-flex align-items-center mt-30">
               <button className="dash-btn-two tran3s me-3 border-0" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Submitting..." : "Submit Property"}
               </button>
               <Link href="#" className="dash-cancel-btn tran3s">Cancel</Link>
            </div>
            {message ? <p className="mt-20 color-dark fw-500">{message}</p> : null}
            {error ? <p className="mt-20 text-danger fw-500">{error}</p> : null}
            </form>
         </div>
      </div>
   )
}

export default AddPropertyBody
