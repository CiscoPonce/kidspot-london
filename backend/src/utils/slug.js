const slugify = require('slugify');
const crypto = require('crypto');

/**
 * Generates an SEO-friendly slug for a venue.
 * 
 * @param {string} name - The venue name
 * @param {string} borough - The borough name
 * @param {object} options - Generation options
 * @param {boolean} options.appendHash - Whether to append a 4-char random hash
 * @returns {string} The generated slug
 */
function generateSlug(name, borough, { appendHash = false } = {}) {
  const base = borough ? `${name}-${borough}` : name;
  let slug = slugify(base, { lower: true, strict: true });
  
  if (appendHash) {
    const hash = crypto.randomBytes(2).toString('hex');
    slug = `${slug}-${hash}`;
  }
  
  return slug;
}

module.exports = { generateSlug };
