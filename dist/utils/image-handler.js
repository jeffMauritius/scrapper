"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadImage = downloadImage;
exports.uploadToVercelBlob = uploadToVercelBlob;
exports.generateUniqueFilename = generateUniqueFilename;
const blob_1 = require("@vercel/blob");
const axios_1 = __importDefault(require("axios"));
async function downloadImage(url) {
    try {
        const response = await axios_1.default.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        return Buffer.from(response.data, 'binary');
    }
    catch (error) {
        console.error(`Erreur lors du téléchargement de l'image ${url}:`, error);
        throw error;
    }
}
async function uploadToVercelBlob(imageBuffer, filename) {
    try {
        const blob = await (0, blob_1.put)(filename, imageBuffer, {
            access: 'public',
            addRandomSuffix: true
        });
        return blob.url;
    }
    catch (error) {
        console.error(`Erreur lors de l'upload vers Vercel Blob:`, error);
        throw error;
    }
}
function generateUniqueFilename(url, venueId, index) {
    var _a;
    const extension = ((_a = url.split('.').pop()) === null || _a === void 0 ? void 0 : _a.split('?')[0]) || 'jpg';
    return `venues/${venueId}/image-${index}.${extension}`;
}
//# sourceMappingURL=image-handler.js.map