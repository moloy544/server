import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async ({ image, imageId, folderPath }) => {
    try {
        if (!image && !imageId && !folderPath) {
            return { status: 404, message: "Some fildes is missing" };
        }
        //upload the file on cloudinary
        const cloudinaryResponse = await cloudinary.uploader.upload(image,
            {
                public_id: imageId,
                folder: folderPath
            });

        return cloudinaryResponse;

    } catch (error) {
        console.log(error)
        return { status: 500, message: "Error while uploading cloudinary" };
    }
};

const deleteImageFromCloudinary = async ({ publicId }) => {

    try {
        if (!publicId) {
            return { status: 404, message: "publicId is missing" };
        }
        //upload the file on cloudinary
        const cloudinaryResponse = await cloudinary.api.delete_resources(`moviesbazaar/thambnails/${publicId}.jpg`);
        return cloudinaryResponse;

    } catch (error) {
        console.log(error)
        return { status: 500, message: "Error while uploading cloudinary" };
    }

};


const renameImageFromCloudinary = async ({ publicId, newPublicId }) => {
    try {

        // Use cloudinary.uploader.rename to rename the image
        const renameImage = await cloudinary.uploader.rename(
            `${publicId}.jpg`,
            `${newPublicId}.jpg`,
            { resource_type: 'image', overwrite: true }
        );

        if (renameImage) {
            return { 
                status: 200, 
                message: "Successfully renamed image from cloudinary",
                imageUrl: renameImage
            };
        }else{
console.log(renameImage)
            return { 
                status: 200, 
                message: "can't rename image from cloudinary",
            };
        }
        
    } catch (error) {
        console.error("Error while renaming image:", error);
        throw error;
    }
};



export { uploadOnCloudinary, deleteImageFromCloudinary, renameImageFromCloudinary };