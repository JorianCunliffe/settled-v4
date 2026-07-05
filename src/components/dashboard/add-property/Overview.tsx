import NiceSelect from "@/ui/NiceSelect";
import { ChangeEvent } from "react";

interface OverviewProps {
   onCategoryChange: (event: ChangeEvent<HTMLSelectElement>) => void;
   onListingTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

const Overview = ({ onCategoryChange, onListingTypeChange }: OverviewProps) => {

   return (
      <div className="bg-white card-box border-20">
         <h4 className="dash-title-three">Overview</h4>
         <div className="dash-input-wrapper mb-30">
            <label htmlFor="">Property Title*</label>
            <input name="title" type="text" placeholder="Your Property Name" required />
         </div>
         <div className="dash-input-wrapper mb-30">
            <label htmlFor="">Description*</label>
            <textarea name="description" className="size-lg" placeholder="Write about property..."></textarea>
         </div>
         <div className="row align-items-end">
            <div className="col-md-6">
               <div className="dash-input-wrapper mb-30">
                  <label htmlFor="">Category*</label>
                  <NiceSelect className="nice-select"
                     options={[
                        { value: "Apartments", text: "Apartments" },
                        { value: "Condos", text: "Condos" },
                        { value: "Houses", text: "Houses" },
                        { value: "Industrial", text: "Industrial" },
                        { value: "Villas", text: "Villas" },
                     ]}
                     defaultCurrent={0}
                     onChange={onCategoryChange}
                     name=""
                     placeholder="" />
               </div>
            </div>
            <div className="col-md-6">
               <div className="dash-input-wrapper mb-30">
                  <label htmlFor="">Listed in*</label>
                  <NiceSelect className="nice-select"
                     options={[
                        { value: "Sell", text: "Sell" },
                        { value: "Rent", text: "Rent" },
                     ]}
                     defaultCurrent={0}
                     onChange={onListingTypeChange}
                     name=""
                     placeholder="" />
               </div>
            </div>
            <div className="col-md-6">
               <div className="dash-input-wrapper mb-30">
                  <label htmlFor="">Price*</label>
                  <input name="price" type="number" min="1" placeholder="Your Price" required />
               </div>
            </div>
            <div className="col-md-6">
               <div className="dash-input-wrapper mb-30">
                  <label htmlFor="">Yearly Tax Rate*</label>
                  <input type="text" placeholder="Tax Rate" />
               </div>
            </div>
         </div>
      </div>
   )
}

export default Overview;
