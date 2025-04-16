// public/js/professionalRegistration.js
(function() {
    // State and county data
    const stateCountyData = {
        MO: {
            name: "Missouri",
            counties: [
                "Adair", "Andrew", "Atchison", "Audrain", "Barry", "Barton", 
                "Bates", "Benton", "Bollinger", "Boone", "Buchanan", "Butler", 
                "Caldwell", "Callaway", "Camden", "Cape Girardeau", "Carroll", 
                "Carter", "Cass", "Cedar", "Chariton", "Christian", "Clark", 
                "Clay", "Clinton", "Cole", "Cooper", "Crawford", "Dade", 
                "Dallas", "Daviess", "DeKalb", "Dent", "Douglas", "Dunklin", 
                "Franklin", "Gasconade", "Gentry", "Greene", "Grundy", 
                "Harrison", "Henry", "Hickory", "Holt", "Howard", "Howell", 
                "Iron", "Jackson", "Jasper", "Jefferson", "Johnson", "Knox", 
                "Laclede", "Lafayette", "Lawrence", "Lewis", "Lincoln", "Linn", 
                "Livingston", "Macon", "Madison", "Maries", "Marion", 
                "McDonald", "Mercer", "Miller", "Mississippi", "Moniteau", 
                "Monroe", "Montgomery", "Morgan", "New Madrid", "Newton", 
                "Nodaway", "Oregon", "Osage", "Ozark", "Pemiscot", "Perry", 
                "Pettis", "Phelps", "Pike", "Platte", "Polk", "Pulaski", 
                "Putnam", "Ralls", "Randolph", "Ray", "Reynolds", "Ripley", 
                "St. Charles", "St. Clair", "St. Francois", "St. Louis", 
                "St. Louis City", "Ste. Genevieve", "Saline", "Schuyler", 
                "Scotland", "Scott", "Shannon", "Shelby", "Stoddard", "Stone", 
                "Sullivan", "Taney", "Texas", "Vernon", "Warren", "Washington", 
                "Wayne", "Webster", "Worth", "Wright"
            ]
        },
        IL: {
            name: "Illinois",
            counties: [
                "Adams", "Alexander", "Bond", "Boone", "Brown", "Bureau", 
                "Calhoun", "Carroll", "Cass", "Champaign", "Christian", "Clark", 
                "Clay", "Clinton", "Coles", "Cook", "Crawford", "Cumberland", 
                "DeKalb", "De Witt", "Douglas", "DuPage", "Edgar", "Edwards", 
                "Effingham", "Fayette", "Ford", "Franklin", "Fulton", "Gallatin", 
                "Greene", "Grundy", "Hamilton", "Hancock", "Hardin", "Henderson", 
                "Henry", "Iroquois", "Jackson", "Jasper", "Jefferson", "Jersey", 
                "Jo Daviess", "Johnson", "Kane", "Kankakee", "Kendall", "Knox", 
                "Lake", "LaSalle", "Lawrence", "Lee", "Livingston", "Logan", 
                "Macon", "Macoupin", "Madison", "Marion", "Marshall", "Mason", 
                "Massac", "McDonough", "McHenry", "McLean", "Menard", "Mercer", 
                "Monroe", "Montgomery", "Morgan", "Moultrie", "Ogle", "Peoria", 
                "Perry", "Piatt", "Pike", "Pope", "Pulaski", "Putnam", "Randolph", 
                "Richland", "Rock Island", "Saline", "Sangamon", "Schuyler", 
                "Scott", "Shelby", "St. Clair", "Stark", "Stephenson", "Tazewell", 
                "Union", "Vermilion", "Wabash", "Warren", "Washington", "Wayne", 
                "White", "Whiteside", "Will", "Williamson", "Winnebago", "Woodford"
            ]
        }
    };

    // DOM Elements
    const professionalTypeSelect = document.getElementById('professionalType');
    const stateSelect = document.getElementById('state');
    const countySelect = document.getElementById('county');
    const countySection = document.getElementById('countySection');
    const lenderSection = document.getElementById('lenderSection');
    const photographerSection = document.getElementById('photographerSection');

    // Function to update county options
    function updateCountyOptions() {
        const selectedState = stateSelect.value;
        
        // Clear existing options
        countySelect.innerHTML = '<option value="">Select County</option>';
        
        // If a state is selected, populate counties
        if (stateCountyData[selectedState]) {
            stateCountyData[selectedState].counties.forEach(county => {
                const option = document.createElement('option');
                option.value = county;
                option.textContent = county;
                countySelect.appendChild(option);
            });
        }
    }

    // Update county options when state changes
    stateSelect.addEventListener('change', updateCountyOptions);

    // Professional type change handler
    professionalTypeSelect.addEventListener('change', function() {
        const selectedType = this.value;
        
        // Show/hide county section for title, inspector, contractor
        if (['title', 'inspector', 'contractor', 'photographer'].includes(selectedType)) {
            countySection.style.display = 'block';
        } else {
            countySection.style.display = 'none';
        }

        // Show/hide lender section
        if (selectedType === 'lender') {
            lenderSection.style.display = 'block';
        } else {
            lenderSection.style.display = 'none';
        }
        
        // Show/hide photographer section
        if (selectedType === 'photographer') {
            photographerSection.style.display = 'block';
        } else {
            photographerSection.style.display = 'none';
        }
    });
})();
