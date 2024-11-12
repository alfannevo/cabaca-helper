/**
 * USAGE:
 * yarn download <URL> <TOTAL_DATA>
 * 
 * it will splitted 50 items per file
 * saved in "json_result" folder
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const LIMIT_DATA_PER_FILE = 50;

// Helper function to download a batch of data with limit and offset
async function downloadDataBatch(url, limit, offset, saveFolder, batchNumber) {
    try {
        const response = await axios.get(`${url}?limit=${limit}&offset=${offset}`);
        const data = response.data;

        const indexNumber = (offset + 1) + '_to_' + (limit * batchNumber);

        // Save the batch data to a JSON file
        const filePath = path.join(saveFolder, `data_book_${indexNumber}.json`);
        await fs.outputJson(filePath, data, { spaces: 2 });
        
        console.log(`Downloaded and saved batch ${batchNumber} (offset ${offset}) to ${filePath}`);
    } catch (error) {
        console.error(`Failed to download batch ${batchNumber} (offset ${offset}):`, error.message);
    }
}

// Main function to handle the split downloading with a fixed limit and calculated offset
async function downloadData(url, totalRecords, saveFolder) {
    const limit = LIMIT_DATA_PER_FILE;
    const numRequests = Math.ceil(totalRecords / limit); // Calculate the number of requests needed

    for (let i = 0; i < numRequests; i++) {
        const offset = i * limit;
        await downloadDataBatch(url, limit, offset, saveFolder, i + 1);
    }
    console.log(`Download completed for ${totalRecords} records, saved in ${numRequests} files.`);
}

// CLI input processing
const url = process.argv[2]; // URL from the command line
const totalRecords = parseInt(process.argv[3], 10); // Total number of records to download
const saveFolder = path.resolve(__dirname, '_json_result'); // Folder to save downloaded data

// Ensure the save directory exists
fs.ensureDirSync(saveFolder);

// Input validation
if (!url || isNaN(totalRecords) || totalRecords <= 0) {
    console.error('Usage: yarn download <URL> <total_records>');
    process.exit(1);
}

// Start downloading
downloadData(url, totalRecords, saveFolder);