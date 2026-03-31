const axios = require('axios');

/**
 * Fetch a relevant image URL for the specific subtopic.
 * Uses Bing Thumbnail API for real images (unofficial/public endpoint)
 * This provides "internet" images as requested.
 * @param {string} query The subtopic title
 * @param {string} mainTopic The overall presentation topic (optional)
 * @returns {string} Image URL
 */
const fetchImageForContext = async (query, mainTopic = '') => {
    // Combine main topic with subtopic for more relevance
    // e.g. "C Language" + "Evolution" -> "C Language Evolution"
    let fullQuery = query;
    if (mainTopic && !query.toLowerCase().includes(mainTopic.toLowerCase())) {
        fullQuery = `${mainTopic} ${query}`;
    }

    const safeQuery = encodeURIComponent(fullQuery);
    // Removed c=7 (crop) and rs=1 to prevent "zoomed" cropping on the server side.
    return `https://tse2.mm.bing.net/th?q=${safeQuery}&w=800&h=450&p=0`;
};

/**
 * Enrich subtopics with images.
 * @param {Array} subtopics 
 * @param {string} mainTopic
 * @returns {Promise<Array>} Subtopics with image URLs
 */
const enrichWithImages = async (subtopics, mainTopic = '') => {
    // Process in parallel
    const enriched = await Promise.all(subtopics.map(async (sub) => {
        const imageUrl = await fetchImageForContext(sub.title || sub.topic || '', mainTopic);
        return {
            ...sub,
            image: imageUrl
        };
    }));
    return enriched;
};

module.exports = { fetchImageForContext, enrichWithImages };

