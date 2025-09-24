import { Schema, model } from "mongoose";

const downloadSourceSchema = new Schema({
    content_id: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    qualityType: {
        type: String,
        required: true
    },
    links: [
        {
            quality: String,
            size: String,
            url: String,
            fallbackUrl: {
                type: new Schema(
                    {
                        url: { type: String },
                        size: { type: String }
                    },
                    { _id: false } // prevents auto-adding _id in nested object
                ),
                required: false,
                default: undefined
            },
            _id: false
        }
    ]
});

const DownloadSource = model('download_sources', downloadSourceSchema);

export default DownloadSource;
