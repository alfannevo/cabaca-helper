const fs = require('fs-extra');
const path = require('path');
const xmlbuilder = require('xmlbuilder');

const jsonFolder = path.resolve(__dirname, '_json_result');
const xmlFolder = path.resolve(__dirname, '_xml_result');

const postIndex = 1000;
const mediaIndex = 5000;

// Helper function to convert JSON data to WP XML format
function convertToWpXml(jsonData) {
    const root = xmlbuilder.create('rss', { version: '1.0', encoding: 'UTF-8' });
    root.att('version', '2.0');
    root.att('xmlns:excerpt', 'http://wordpress.org/export/1.2/excerpt/');
    root.att('xmlns:content', 'http://purl.org/rss/1.0/modules/content/');
    root.att('xmlns:wfw', 'http://wellformedweb.org/CommentAPI/');
    root.att('xmlns:dc', 'http://purl.org/dc/elements/1.1/');
    root.att('xmlns:wp', 'http://wordpress.org/export/1.2/');

    const channel = root.ele('channel');
    channel.ele('wp:wxr_version', {}, '1.2');

    jsonData.forEach((item, index) => {
        const title = item.title || 'No Title';
        const writerName = item.writer || 'Unknown';
        const itemSlug = createSlug(title + '-' + writerName);
        const link = `https://mamikos.com/info/book/${itemSlug}`;
        const creator = 'admin';
        let content = '';

        if (item.chapters && item.chapters.length > 0) {
            item.chapters.forEach((value, key) => {
                if (key > 0) {
                    content += '<!--nextpage-->';
                }

                content += `<h2 class="cabaca-chapter-title">${value.title}</h2>`;
                content += value.content;
            });
        }

        const currentDate = Date.now();

        const xmlItem = channel.ele('item');

        xmlItem.ele('title').cdata(title);
        xmlItem.ele('link', {}, link);
        xmlItem.ele('dc:creator').cdata(creator);
        xmlItem.ele('guid', { 'isPermaLink': true }, link);
        xmlItem.ele('content:encoded').cdata(content);
        xmlItem.ele('description', {}, '');
        xmlItem.ele('pubDate', {}, new Date(currentDate).toUTCString());
        xmlItem.ele('excerpt:encoded').cdata('');
        xmlItem.ele('wp:post_id', {}, (index + postIndex + 1));
        xmlItem.ele('wp:post_date').cdata(formatDate(currentDate));
        xmlItem.ele('wp:post_date_gmt').cdata(formatDate(currentDate, 'GMT'));
        xmlItem.ele('wp:post_modified').cdata(formatDate(currentDate));
        xmlItem.ele('wp:post_modified_gmt').cdata(formatDate(currentDate, 'GMT'));
        xmlItem.ele('wp:comment_status').cdata('closed');
        xmlItem.ele('wp:ping_status').cdata('closed');
        xmlItem.ele('wp:post_name').cdata(itemSlug);
        xmlItem.ele('wp:status').cdata('draft');
        xmlItem.ele('wp:post_parent', {}, 0);
        xmlItem.ele('wp:menu_order', {}, 0);
        xmlItem.ele('wp:post_type').cdata('cb_book');
        xmlItem.ele('wp:post_password').cdata('');
        xmlItem.ele('wp:is_sticky', {}, 0);
        xmlItem.ele('category', { domain: 'cb_author', nicename: createSlug(writerName) }).cdata(writerName);
        xmlItem.ele('category', { domain: 'cb_type', nicename: bookTypeValue(item.type).slug }).cdata(bookTypeValue(item.type).label);

        const genreList = item.genres.split(',');
        if (genreList.length > 0) {
            genreList.forEach(genre => {
                xmlItem.ele('category', { domain: 'cb_genre', nicename: createSlug(genre) }).cdata(genre);
            });
        }

        // postmeta
        let postMeta = xmlItem.ele('wp:postmeta');
        postMeta.ele('wp:meta_key', {}, 'cabaca_source_url');
        postMeta.ele('wp:meta_value', {}, item.link);

        // featured image
        if (item.cover) {
            const media = injectMediaAttachment(channel, item.cover, index, currentDate, title);

            postMeta = xmlItem.ele('wp:postmeta');
            postMeta.ele('wp:meta_key', {}, '_thumbnail_id');
            postMeta.ele('wp:meta_value', {}, media);
        }
    });

    return root.end({ pretty: true });
}

function createSlug(stringValue) {
    return stringValue
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function formatDate(date, format = 'non-GMT') {
    date = new Date(date);

    if (format === 'GMT') {
        return date.getUTCFullYear() + '-' +
            String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
            String(date.getUTCDate()).padStart(2, '0') + ' ' +
            String(date.getUTCHours()).padStart(2, '0') + ':' +
            String(date.getUTCMinutes()).padStart(2, '0') + ':' +
            String(date.getUTCSeconds()).padStart(2, '0');
    }

    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0') + ':' +
        String(date.getSeconds()).padStart(2, '0');
}

function bookTypeValue(rawValue) {
    switch (rawValue) {
        case 'book':
            return {
                slug: 'novel',
                label: 'Novel'
            };
        default:
            return {
                slug: 'uncategorized',
                label: 'Uncategorized'
            };
            break;
    }
}

function injectMediaAttachment(xmlNode, mediaUrl, itemIndex, currentDate, postTitle) {
    currentDate = new Date(currentDate);

    const yearFolder = currentDate.getFullYear();
    const monthFolder = String(currentDate.getMonth() + 1).padStart(2, '0');

    const mediaName = createSlug(postTitle);

    // Get Image extension
    const decodedUrl = decodeURIComponent(mediaUrl);
    const fileName = decodedUrl.split('/').pop().split('?')[0];
    const fileExtension = fileName.split('.').pop();

    // Directory uploads
    const dirUploads = `${yearFolder}/${monthFolder}/${mediaName}.${fileExtension}`;
    const totalChar = dirUploads.length;

    const mediaId = (itemIndex + mediaIndex + 1);

    const mediaAttachment = xmlNode.ele('item');

    mediaAttachment.ele('title', {}, postTitle);
    mediaAttachment.ele('link', {}, `https://mamikos.com/info/wp-content/uploads/${dirUploads}`);
    mediaAttachment.ele('wp:post_id', {}, mediaId);

    mediaAttachment.ele('wp:post_type', {}, 'attachment');
    mediaAttachment.ele('wp:post_parent', {}, (itemIndex + postIndex + 1));
    mediaAttachment.ele('wp:attachment_url', {}, cleaningMediaUrl(mediaUrl));

    const fileTypeMeta = mediaAttachment.ele('wp:postmeta');
    fileTypeMeta.ele('wp:meta_key', {}, '_wp_attached_file');
    fileTypeMeta.ele('wp:meta_value', {}, `${dirUploads}`);

    const imageMeta = mediaAttachment.ele('wp:postmeta');
    imageMeta.ele('wp:meta_key', {}, '_wp_attachment_metadata');
    imageMeta.ele('wp:meta_value', {}, `
        a:5:{s:5:"width";i:720;s:6:"height";i:720;s:4:"file";s:${totalChar}:"${dirUploads}";s:5:"sizes";a:0:{}s:10:"image_meta";a:0:{}}
    `);

    return mediaId;
}

function cleaningMediaUrl(mediaUrl) {
    let cleanMediaUrl = mediaUrl.replace(/\?(?=\w+=)/g, (match, offset) => offset === mediaUrl.indexOf('?') ? '?' : '&');
    cleanMediaUrl = decodeURIComponent(cleanMediaUrl);

    const urlObj = new URL(cleanMediaUrl);

    const params = new URLSearchParams(urlObj.search);

    params.delete('download');

    urlObj.search = params.toString();

    return urlObj.toString();
}


// Main function to convert all JSON files to XML format
async function convertAllJsonToXml() {
    try {
        const jsonFiles = await fs.readdir(jsonFolder);
        await fs.ensureDir(xmlFolder);

        for (const file of jsonFiles) {
            if (path.extname(file) === '.json') {
                const filePath = path.join(jsonFolder, file);
                const jsonData = await fs.readJson(filePath);

                // Convert JSON data to WP XML format
                const xmlData = convertToWpXml(jsonData);

                // Save XML file
                const xmlFileName = file.replace('.json', '.xml');
                const xmlFilePath = path.join(xmlFolder, xmlFileName);
                await fs.outputFile(xmlFilePath, xmlData);
                
                console.log(`Converted ${file} to ${xmlFileName}`);
            }
        }

        console.log('All JSON files have been converted to XML format.');
    } catch (error) {
        console.error('Error converting JSON to XML:', error.message);
    }
}

// Run the conversion
convertAllJsonToXml();