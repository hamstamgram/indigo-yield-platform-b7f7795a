#!/usr/bin/env node

import XLSX from 'xlsx';
import path from 'path';

const filePath = path.join(process.cwd(), 'ops/import/first_run.xlsx');
console.log('📁 Analyzing Excel file:', filePath);

const workbook = XLSX.readFile(filePath);

console.log('\n📊 Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n📄 Sheet: ${sheetName}`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  if (data.length > 0) {
    console.log(`  Rows: ${data.length}`);
    console.log('  Columns:', Object.keys(data[0]));
    console.log('\n  Sample data (first 3 rows):');
    data.slice(0, 3).forEach((row, index) => {
      console.log(`  Row ${index + 1}:`, row);
    });
  }
});
