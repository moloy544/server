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

const uploadOnCloudinary = async ({ image, publicId, folderPath }) => {
    try {

        // Set configuration to cloudinary_config_2 for upload 
        cloudinary.config(cloudinary_config_2);

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

        let public_id;
        let config;
        const match = imageLink.match(/https:\/\/res.cloudinary.com\/([^\/]+)\//);
        const extractedValue = match ? match[1] : null;

        if (extractedValue === cloudName1) {
            config = cloudinary_config_1
            public_id = `moviesbazaar/thambnails/${id}`;
        } else if (extractedValue === cloudName2) {
            config = cloudinary_config_2;
            public_id = `movies/thumbnails/${id}`;
        } else {
            return { status: 400, message: "Unknown Cloudinary account" };
        };

        // configure the cloudinary account
        cloudinary.config(config);

        // Delete the image from Cloudinary
        const cloudinaryResponse = await cloudinary.api.delete_resources([public_id], { type: 'upload', resource_type: 'image' });

        return cloudinaryResponse;

    } catch (error) {
        console.log(error);
        return { status: 500, message: "Error while deleting image from Cloudinary" };
    }
};

// function for delete for first cloudinary account image 
const deleteFirstAccountCloudinaryImage = async ({ id, imageLink }) => {
    try {
        if (!id || !imageLink) {

            return { status: 404, message: "Missing value found!" };
        }

        const public_id = `moviesbazaar/thambnails/${id}`;
        const match = imageLink.match(/https:\/\/res.cloudinary.com\/([^\/]+)\//);
        const extractedValue = match ? match[1] : null;

        // check if image is first cloudinery account the delete it
        if (extractedValue === cloudName1) {

            // configure the first cloudinary account
            cloudinary.config(cloudinary_config_1);

            // Delete the image from First Cloudinary Account
            await cloudinary.api.delete_resources([public_id], { type: 'upload', resource_type: 'image' });

        };

    } catch (error) {
        console.log(error);
        return { status: 500, message: "Error while deleting image from Cloudinary" };
    }
};

export {
    uploadOnCloudinary,
    deleteImageFromCloudinary,
    deleteFirstAccountCloudinaryImage
};
