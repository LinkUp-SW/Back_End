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
  