// seedTitleCompanies.js
require('dotenv').config();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Professional = require('./models/Professional');
const bcrypt = require('bcryptjs');
const path = require('path');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Path to the Excel file
const excelFilePath = path.join(__dirname, 'Title Companies.xlsx');

async function seedTitleCompanies() {
  try {
     // First, remove all existing title company professionals
     console.log('Removing existing title companies...');
     const deletionResult = await Professional.deleteMany({ 
       professionalType: "title" 
     });
     
     console.log(`Removed ${deletionResult.deletedCount} existing title companies`);
    // Read the Excel file
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} title company entries in Excel file`);

    // Create a default password hash
    const defaultPassword = await bcrypt.hash('TitleCompany123', 10);

    // Track counties already processed to ensure one company per county
    const processedCounties = new Set();

    for (const row of data) {
      const companyName = row['Title Company'];
      
      function formatCounty(countyName) {
        if (!countyName) return '';
        // Remove "County" suffix if present
        return countyName.replace(/\s+County$/i, '').trim();
      }
      
      // Then in your loop:
      const county = formatCounty(row['County']);
      
      if (!companyName || !county) {
        console.warn('Skipping row with missing company name or county:', row);
        continue;
      }
      
      // Skip if we already processed a company for this county
      if (processedCounties.has(county)) {
        console.log(`Skipping duplicate county: ${county} - already assigned to another company`);
        continue;
      }
            
      // Generate a unique email if not provided
      const email = row['Email'] || `${county.toLowerCase().replace(/\s+/g, '')}@titleservices.example.com`;
      
      // Create new title company professional - one per county
      const titleCompany = new Professional({
        name: companyName, // Use company name as contact name for now
        email: email,
        password: defaultPassword,
        companyName: companyName,
        phone: row['Phone 1'] || '',
        address: row['Address'] || '',
        city: row['City'] || '',
        state: row['State'] || 'MO',
        professionalType: "title",
        counties: [county], // Just one county per company
        isVerified: true
      });

      await titleCompany.save();
      processedCounties.add(county);
      console.log(`Added title company: ${companyName} serving ${county} county`);
    }
    
    console.log('✅ Successfully seeded title companies');
    console.log(`Total counties covered: ${processedCounties.size}`);
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error seeding title companies:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

seedTitleCompanies();