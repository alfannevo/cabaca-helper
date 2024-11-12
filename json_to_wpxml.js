const fs = require('fs-extra');
const path = require('path');
const xmlbuilder = require('xmlbuilder');

const jsonFolder = path.resolve(__dirname, '_json_result');
const xmlFolder = path.resolve(__dirname, '_xml_result');

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

    jsonData.forEach((item) => {
        const title = item.title || 'No Title';
        const link = 'https://mamikos.com/info/book/xxx'; // dummy
        const creator = 'admin';
        const content = item.chapters[0].content;

        const xmlItem = channel.ele('item');
        xmlItem.ele('title').cdata(title);
        xmlItem.ele('link', {}, link);
        xmlItem.ele('dc:creator').cdata(creator);
        xmlItem.ele('guid', { 'isPermaLink': true }, link);
        xmlItem.ele('content:encoded').cdata(content);
        xmlItem.ele('description', {}, '');
        xmlItem.ele('pubDate', {}, new Date(Date.now()).toUTCString());
    });

    return root.end({ pretty: true });
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