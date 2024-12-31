import { v2 as cloudinary } from 'cloudinary';

// Environment variables for cloud names and configurations
const cloudinary_config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
};

 // Set configuration to cloudinary_config for upload and others operations
 cloudinary.config(cloudinary_config);

 // Function to upload image to Cloudinary with provided publicId and folderPath
const uploadOnCloudinary = async ({ image, publicId, folderPath }) => {
    try {

        if (!image && !publicId && !folderPath) {
            return { status: 404, message: "Some fields are missing" };
        };

        // Upload the file to Cloudinary
        const cloudinaryResponse = await cloudinary.uploader.upload(image, {
            public_id: publicId,
            folder: folderPath,
        });

        return cloudinaryResponse;

    } catch (error) {
        console.log(error);
        return { status: 500, message: "Error while uploading to Cloudinary" };
    }
};

// Function to delete image from Cloudinary
const deleteImageFromCloudinary = async ({ id, imageLink }) => {
    try {
        if (!id || !imageLink) {

            return { status: 404, message: "Missing value found!" };
        }

        const public_id = `movies/thumbnails/${id}`;
    
        // Delete the image from Cloudinary
        const cloudinaryResponse = await cloudinary.api.delete_resources([public_id], { type: 'upload', resource_type: 'image' });

        return cloudinaryResponse;

    } catch (error) {
        console.log(error);
        return { status: 500, message: "Error while deleting image from Cloudinary" };
    }
};

export {
    uploadOnCloudinary,
    deleteImageFromCloudinary,
};
