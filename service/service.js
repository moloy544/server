import axios from "axios";
import geoip from "geoip-lite";

// get the user location details
export async function getUserLocationDetails() {
    try {
        const response = await axios.get('https://ipapi.co/json/');
        const data = response.data;
        if (response.status === 200) {
          return data
        }else{
            console.error('Error fetching location data:', error.message);
            return null;
        }
    } catch (error) {
        console.error('Error fetching country data:', error.message);
        return null;
    }
  };

  export const getUserGeoDetails = (ip)=>{

    try {
        if(!ip || ip==='0.0.0.0'){
            return null
        };
    
        const geoData = geoip.lookup(ip);

        return geoData;
    
    } catch (error) {
        console.log('Error while getting user GEO details:', error)
        
    }
  }


  