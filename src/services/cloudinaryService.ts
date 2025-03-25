import { v2 as cloudinary } from 'cloudinary';

/**
 * Extracts the publicId from a Cloudinary URL.
 * Decodes any percent-encoded characters so it matches
 * the actual public ID stored in Cloudinary.
 *
 * @param {string} url - Cloudinary file URL
 * @returns {string | null} - Extracted publicId or null if invalid
 */
export const extractPublicId = (url: string): string | null => {
    // Matches: /upload/(v12345/)? then capture everything until the final extension
    // allowing for letters/digits 
    const regex = /upload\/(?:v\d+\/)?([^.]*)\.[a-zA-Z0-9]+$/;
    const match = url.match(regex);
    if (!match) return null;
  
    // Decode any percent-encoded characters
    const decodedPublicId = decodeURIComponent(match[1]);
  
    return decodedPublicId;
  };


export const processMediaArray = async (mediaArray: any[] = []) => {
    if (!mediaArray || !Array.isArray(mediaArray)) return [];
    
    const processedMedia = [];
    for (const mediaItem of mediaArray) {
        let mediaUrl = mediaItem.media;
        
        // Check if the media is in base64 format
        if (mediaItem.media && mediaItem.media.startsWith('data:')) {
            try {
                // Upload to cloudinary
                const uploadResponse = await cloudinary.uploader.upload(mediaItem.media, {
                    resource_type: 'auto',
                });
                
                mediaUrl = uploadResponse.secure_url;
            } catch (error) {
                console.error('Error uploading to Cloudinary:', error);
            }
        }
        
        processedMedia.push({
            media: mediaUrl,
            title: mediaItem.title || '',
            description: mediaItem.description || ''
        });
    }
    
    return processedMedia;
};

  