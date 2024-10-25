import { Schema, model } from "mongoose";

const downloadLinkSchema = new Schema({
    content_id: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    qualityType:{
        type: String,
        required: true
    },
    links: [
        {
            quality: String,
            size: String,
            url: String,
            _id: false
        }
    ]
});

const DownloadLinks = model('DownloadLinks', downloadLinkSchema);

export default DownloadLinks;
