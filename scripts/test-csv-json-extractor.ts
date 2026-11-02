import { detectDelimiter, parseCsvRaw, parseCsvToTable } from '../src/extraction/csvParser.js';
import { flattenObject, parseJsonToTable } from '../src/extraction/jsonParser.js';

console.log('🧪 Starting CSV and JSON Extraction Tests (Phase 1)...');

// Test 1: Delimiter Detection
const commaCsv = 'name,sales,margin\nAlpha,100,0.2\nBeta,200,0.25';
const semiCsv = 'name;sales;margin\nAlpha;100;0.2\nBeta;200;0.25';
const tabCsv = 'name\tsales\tmargin\nAlpha\t100\t0.2\nBeta\t200\t0.25';
const pipeCsv = 'name|sales|margin\nAlpha|100|0.2\nBeta|200|0.25';

if (detectDelimiter(commaCsv) !== ',') throw new Error('Comma delimiter detection failed');
if (detectDelimiter(semiCsv) !== ';') throw new Error('Semicolon delimiter detection failed');
if (detectDelimiter(tabCsv) !== '\t') throw new Error('Tab delimiter detection failed');
if (detectDelimiter(pipeCsv) !== '|') throw new Error('Pipe delimiter detection failed');
console.log('✔ Test 1: Auto-detection of CSV delimiters (comma, semicolon, tab, pipe) passed');

// Test 2: RFC-4180 Quoted CSV with commas and escaped quotes
const complexCsv = `Item,Description,Price,Status
"Laptop, Pro","Ultra thin ""15-inch"" display",1299.99,In Stock
"Mouse, Wireless","Ergonomic with ""Bluetooth""",49.99,Low Stock`;

const parsedCsv = parseCsvToTable(complexCsv, { tableName: 'Hardware' });
if (!parsedCsv) throw new Error('Failed to parse complex CSV');
if (parsedCsv.totalRows !== 2) throw new Error(`Expected 2 rows, got ${parsedCsv.totalRows}`);
if (parsedCsv.headers[0] !== 'Item' || parsedCsv.headers[1] !== 'Description') {
  throw new Error(`Unexpected headers: ${parsedCsv.headers.join(', ')}`);
}
if (parsedCsv.rows[0][0] !== 'Laptop, Pro') {
  throw new Error(`Quoted comma parsing failed: got "${parsedCsv.rows[0][0]}"`);
}
if (parsedCsv.rows[0][1] !== 'Ultra thin "15-inch" display') {
  throw new Error(`Escaped quote parsing failed: got "${parsedCsv.rows[0][1]}"`);
}
if (parsedCsv.sourceType !== 'csv') throw new Error('Expected sourceType === "csv"');
console.log('✔ Test 2: RFC-4180 quoted values and escaped quotes parsed accurately');

// Test 3: JSON Flattening with nested object hierarchy
const nestedSample = {
  name: 'Product A',
  sales: 1200,
  details: {
    category: 'Electronics',
    rating: 4.5,
  },
};

const flattened = flattenObject(nestedSample);
if (flattened['details.category'] !== 'Electronics') {
  throw new Error(`Expected details.category === "Electronics", got "${flattened['details.category']}"`);
}
if (flattened['details.rating'] !== '4.5') {
  throw new Error(`Expected details.rating === "4.5", got "${flattened['details.rating']}"`);
}
console.log('✔ Test 3: Nested JSON dot-notation flattening verified');

// Test 4: JSON Array to ExtractedTable conversion
const jsonDataset = [
  {
    name: 'Product A',
    sales: 1200,
    details: { category: 'Electronics', rating: 4.5 },
  },
  {
    name: 'Product B',
    sales: 850,
    details: { category: 'Accessories', rating: 4.1 },
  },
  {
    name: 'Product C',
    sales: 2100,
    details: { category: 'Electronics', rating: 4.8 },
  },
];

const parsedJson = parseJsonToTable(jsonDataset, { tableName: 'Inventory' });
if (!parsedJson) throw new Error('Failed to parse JSON dataset to table');
if (parsedJson.totalRows !== 3) throw new Error(`Expected 3 rows, got ${parsedJson.totalRows}`);
if (!parsedJson.headers.includes('details.category') || !parsedJson.headers.includes('details.rating')) {
  throw new Error(`Missing expected flattened headers: ${parsedJson.headers.join(', ')}`);
}
if (parsedJson.sourceType !== 'json') throw new Error('Expected sourceType === "json"');
console.log('✔ Test 4: JSON dataset conversion to standardized ExtractedTable passed');

console.log('🎉 PHASE 1 VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
