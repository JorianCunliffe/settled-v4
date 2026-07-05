import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectProperties } from "../redux/features/propertySlice";

const UseProperty = () => {
   const seededProperties = useSelector(selectProperties);
   const [properties, setProperties] = useState(seededProperties)

   useEffect(() => {
      let isMounted = true;

      const loadCreatedListings = async () => {
         try {
            const response = await fetch("/api/listings", { cache: "no-store" });

            if (!response.ok) {
               return;
            }

            const payload = (await response.json()) as { listings?: any[] };

            if (isMounted) {
               setProperties([...seededProperties, ...(payload.listings ?? [])]);
            }
         } catch {
            if (isMounted) {
               setProperties(seededProperties);
            }
         }
      };

      loadCreatedListings();

      return () => {
         isMounted = false;
      };
   }, [seededProperties]);

   return {
      properties,
      setProperties
   }
}

export default UseProperty;
