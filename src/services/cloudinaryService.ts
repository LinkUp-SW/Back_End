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

/**
 * Delete media files from Cloudinary
 * @param mediaUrls Array of media URLs to delete
 */
export const deleteMediaFromCloud = async (mediaUrls: string[]): Promise<void> => {
  if (!mediaUrls || mediaUrls.length === 0) return;
  
  try {
    const deletePromises = mediaUrls.map(url => {
      // Extract the public_id from the URL
      // Cloudinary URLs typically have format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{extension}
      const urlParts = url.split('/');
      const fileNameWithExtension = urlParts[urlParts.length - 1];
      const publicId = fileNameWithExtension.split('.')[0];
      
      // Call Cloudinary's destroy method
      return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
    });
    
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting media from Cloudinary:', error);
  }
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
