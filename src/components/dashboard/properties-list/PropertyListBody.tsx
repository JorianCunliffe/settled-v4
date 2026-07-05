"use client"
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo"
import NiceSelect from "@/ui/NiceSelect";
import PropertyTableBody from "./PropertyTableBody";

const PropertyListBody = () => {

   const selectHandler = (e: any) => { };

   return (
      <div className="dashboard-body">
         <div className="position-relative">
            <DashboardHeaderTwo title="My Properties" />
            <h2 className="main-title d-block d-lg-none">My Properties</h2>
            <div className="d-sm-flex align-items-center justify-content-between mb-25">
               <div className="fs-16">Showing submitted properties from your listing setup flow</div>
               <div className="d-flex ms-auto xs-mt-30">
                  <div className="short-filter d-flex align-items-center ms-sm-auto">
                     <div className="fs-16 me-2">Sort by:</div>
                     <NiceSelect className="nice-select"
                        options={[
                           { value: "1", text: "Newest" },
                           { value: "2", text: "Best Seller" },
                           { value: "3", text: "Best Match" },
                           { value: "4", text: "Price Low" },
                           { value: "5", text: "Price High" },
                        ]}
                        defaultCurrent={0}
                        onChange={selectHandler}
                        name=""
                        placeholder="" />
                  </div>
               </div>
            </div>

            <div className="bg-white card-box p0 border-20">
               <div className="table-responsive pt-25 pb-25 pe-4 ps-4">
                  <table className="table property-list-table">
                     <thead>
                        <tr>
                           <th scope="col">Title</th>
                           <th scope="col">Date</th>
                           <th scope="col">Details</th>
                           <th scope="col">Status</th>
                           <th scope="col">Action</th>
                        </tr>
                     </thead>
                     <PropertyTableBody />
                  </table>
               </div>
            </div>
         </div>
      </div>
   )
}

export default PropertyListBody
