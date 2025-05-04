const CONFIG = {
    CLIENT_ID: 'YOUR_CLIENT_ID',
    API_KEY: 'YOUR_API_KEY',
    SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',
    DISCOVERY_DOCS: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets'
};

let currentCustomerIndex = null;
let salesChart = null;
let autoRefreshInterval = null;
