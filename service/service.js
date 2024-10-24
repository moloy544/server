import axios from "axios";

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
  }
  