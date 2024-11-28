import { v2 as cloudinary } from 'cloudinary';

// Environment variables for cloud names and configurations
const cloudName1 = process.env.CLOUDINARY_CLOUD_NAME;
const cloudName2 = process.env.CLOUDINARY_CLOUD_NAME_2;

const cloudinary_config_1 = {
    cloud_name: cloudName1,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
};

const cloudinary_config_2 = {
    cloud_name: cloudName2,
    api_key: process.env.CLOUDINARY_API_KEY_2,
    api_secret: process.env.CLOUDINARY_API_SECRET_2
};

// Set configuration to cloudinary_config_2 for upload 
cloudinary.config(cloudinary_config_1);


// Function to fetch all images from a specific folder
export const fetchImagesFromFolder = async (folderPath) => {
    try {
        const resources = await cloudinary.api.resources({
            type: 'upload',
            prefix: folderPath, // Specify the folder path
            max_results: 20, // Limit results (you can paginate if needed)
        });

        // Log the URLs of the images
        const imageUrls = resources.resources.map(resource => resource.secure_url);

        // Process or transfer images as needed
        return imageUrls;
    } catch (error) {
        console.error('Error fetching images:', error);
    }
};

// Example usage
const folderPath = 'your_folder_name';
fetchImagesFromFolder(folderPath);
