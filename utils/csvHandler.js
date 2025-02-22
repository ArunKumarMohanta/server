require('dotenv').config();
const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Uploads'; // Name of the sheet where data is stored

// Authenticate with Google Sheets API
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_CREDENTIALS_PATH, // Path to service account key file
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return await auth.getClient();
}

// Function to append data to Google Sheets
async function writeToGoogleSheets(uploadDate, fileName, trackerId, uploaderName) {
  try {
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const values = [[uploadDate, fileName, trackerId, uploaderName]];
    const request = {
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:D`, // Ensure this matches your headers
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values },
    };

    await sheets.spreadsheets.values.append(request);
    console.log('Data added to Google Sheets:', values);
  } catch (error) {
    console.error('Error writing to Google Sheets:', error);
  }
}

module.exports = { writeToGoogleSheets };
