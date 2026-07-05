"use client"

import Image from "next/image"
import { ChangeEvent, useEffect, useState } from "react"

import icon_1 from "@/assets/images/dashboard/icon/icon_18.svg";
import icon_3 from "@/assets/images/dashboard/icon/icon_20.svg";
import icon_4 from "@/assets/images/dashboard/icon/icon_21.svg";

interface Listing {
   id: number;
   thumb: string;
   title: string;
   address: string;
   location: string;
   price: number;
   status: string;
   createdAt: string;
   property_info: {
      sqft: number;
      bed: string;
      bath: string;
   };
}

interface EditState {
   address: string;
   bathrooms: number;
   bedrooms: number;
   location: string;
   price: number;
   size: number;
   title: string;
}

function getEditState(listing: Listing): EditState {
   return {
      address: listing.address,
      bathrooms: Number(listing.property_info.bath),
      bedrooms: Number(listing.property_info.bed),
      location: listing.location,
      price: listing.price,
      size: listing.property_info.sqft,
      title: listing.title,
   };
}

function formatDate(value: string) {
   return new Intl.DateTimeFormat("en-AU", {
      dateStyle: "medium",
      timeZone: "Australia/Brisbane",
   }).format(new Date(value));
}

const PropertyTableBody = () => {
   const [listings, setListings] = useState<Listing[]>([]);
   const [editingId, setEditingId] = useState<number | null>(null);
   const [editState, setEditState] = useState<EditState | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   const loadListings = async () => {
      setIsLoading(true);
      setError(null);

      try {
         const response = await fetch("/api/listings", { cache: "no-store" });

         if (!response.ok) {
            throw new Error("Unable to load properties.");
         }

         const payload = (await response.json()) as { listings: Listing[] };
         setListings(payload.listings);
      } catch (nextError) {
         setError(nextError instanceof Error ? nextError.message : "Unable to load properties.");
      } finally {
         setIsLoading(false);
      }
   };

   useEffect(() => {
      loadListings();
   }, []);

   const handleEditChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (!editState) {
         return;
      }

      const { name, value } = event.target;
      const numericFields = ["bathrooms", "bedrooms", "price", "size"];

      setEditState({
         ...editState,
         [name]: numericFields.includes(name) ? Number(value) : value,
      });
   };

   const startEdit = (listing: Listing) => {
      setEditingId(listing.id);
      setEditState(getEditState(listing));
   };

   const cancelEdit = () => {
      setEditingId(null);
      setEditState(null);
   };

   const saveEdit = async (id: number) => {
      if (!editState) {
         return;
      }

      setError(null);

      try {
         const response = await fetch(`/api/listings/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editState),
         });

         if (!response.ok) {
            const payload = (await response.json()) as { message?: string };
            throw new Error(payload.message ?? "Unable to update property.");
         }

         const payload = (await response.json()) as { listing: Listing };
         setListings((current) =>
            current.map((listing) =>
               listing.id === id ? payload.listing : listing,
            ),
         );
         cancelEdit();
      } catch (nextError) {
         setError(nextError instanceof Error ? nextError.message : "Unable to update property.");
      }
   };

   const deleteProperty = async (id: number) => {
      setError(null);

      try {
         const response = await fetch(`/api/listings/${id}`, {
            method: "DELETE",
         });

         if (!response.ok) {
            const payload = (await response.json()) as { message?: string };
            throw new Error(payload.message ?? "Unable to delete property.");
         }

         setListings((current) => current.filter((listing) => listing.id !== id));
      } catch (nextError) {
         setError(nextError instanceof Error ? nextError.message : "Unable to delete property.");
      }
   };

   if (isLoading) {
      return (
         <tbody className="border-0">
            <tr>
               <td colSpan={5}>Loading submitted properties...</td>
            </tr>
         </tbody>
      );
   }

   if (error && listings.length === 0) {
      return (
         <tbody className="border-0">
            <tr>
               <td colSpan={5}>{error}</td>
            </tr>
         </tbody>
      );
   }

   if (listings.length === 0) {
      return (
         <tbody className="border-0">
            <tr>
               <td colSpan={5}>No submitted properties yet.</td>
            </tr>
         </tbody>
      );
   }

   return (
      <tbody className="border-0">
         {error ? (
            <tr>
               <td colSpan={5} className="text-danger">{error}</td>
            </tr>
         ) : null}
         {listings.map((item) => {
            const isEditing = editingId === item.id && editState;

            return (
               <tr key={item.id}>
                  <td>
                     <div className="d-lg-flex align-items-center position-relative">
                        <Image src={item.thumb} width={110} height={90} alt="" className="p-img" />
                        <div className="ps-lg-4 md-pt-10">
                           {isEditing ? (
                              <>
                                 <input className="mb-2" name="title" value={editState.title} onChange={handleEditChange} />
                                 <input className="mb-2" name="address" value={editState.address} onChange={handleEditChange} />
                                 <input name="location" value={editState.location} onChange={handleEditChange} />
                              </>
                           ) : (
                              <>
                                 <div className="property-name tran3s color-dark fw-500 fs-20">{item.title}</div>
                                 <div className="address">{item.address}</div>
                                 <strong className="price color-dark">${item.price.toLocaleString()}</strong>
                              </>
                           )}
                        </div>
                     </div>
                  </td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>
                     {isEditing ? (
                        <div className="d-flex flex-column gap-2">
                           <input name="price" type="number" value={editState.price} onChange={handleEditChange} />
                           <input name="size" type="number" value={editState.size} onChange={handleEditChange} />
                           <input name="bedrooms" type="number" value={editState.bedrooms} onChange={handleEditChange} />
                           <input name="bathrooms" type="number" value={editState.bathrooms} onChange={handleEditChange} />
                        </div>
                     ) : (
                        0
                     )}
                  </td>
                  <td>
                     <div className="property-status">{item.status}</div>
                  </td>
                  <td>
                     {isEditing ? (
                        <div className="d-flex gap-2 justify-content-end">
                           <button className="dash-btn-two tran3s border-0" type="button" onClick={() => saveEdit(item.id)}>Save</button>
                           <button className="dash-cancel-btn tran3s border-0" type="button" onClick={cancelEdit}>Cancel</button>
                        </div>
                     ) : (
                        <div className="action-dots float-end">
                           <button className="action-btn dropdown-toggle" type="button" data-bs-toggle="dropdown"
                              aria-expanded="false">
                              <span></span>
                           </button>
                           <ul className="dropdown-menu dropdown-menu-end">
                              <li><a className="dropdown-item" href={`/listing/${item.id}`}><Image src={icon_1} alt="" className="lazy-img" /> View</a></li>
                              <li><button className="dropdown-item" type="button" onClick={() => startEdit(item)}><Image src={icon_3} alt="" className="lazy-img" /> Edit</button></li>
                              <li><button className="dropdown-item" type="button" onClick={() => deleteProperty(item.id)}><Image src={icon_4} alt="" className="lazy-img" /> Delete</button></li>
                           </ul>
                        </div>
                     )}
                  </td>
               </tr>
            );
         })}
      </tbody>
   )
}

export default PropertyTableBody
