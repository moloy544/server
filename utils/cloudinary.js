import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async ({ thambnail, imdbId, folderPath }) => {
    try {
        if (!thambnail && !imdbId && !folderPath) {
            return { status: 404, message: "Some fildes is missing" };
        }
        //upload the file on cloudinary
        const cloudinaryResponse = await cloudinary.uploader.upload(thambnail,
            {
                public_id: imdbId,
                folder: folderPath
            });

        return cloudinaryResponse;

    } catch (error) {

        return { status: 500, message: "Error while uploading cloudinary" };
    }
}



export { uploadOnCloudinary };