// utils/stateCountyData.js
document.addEventListener('DOMContentLoaded', function() {
    const stateSelect = document.getElementById('state');
    const countySelect = document.getElementById('county');

    // Ensure you have the correct data from your utility file
    const stateCountyData = {
        MO: {
            name: "Missouri",
            counties: [/* full list of MO counties */]
        },
        IL: {
            name: "Illinois", 
            counties: [/* full list of IL counties */]
        }
    };

    function updateCountyOptions() {
        const selectedState = stateSelect.value;
        
        // Clear existing options
        countySelect.innerHTML = '<option value="">Select County</option>';
        
        // Populate counties for the selected state
        if (stateCountyData[selectedState]) {
            stateCountyData[selectedState].counties.forEach(county => {
                const option = document.createElement('option');
                option.value = county;
                option.textContent = county;
                countySelect.appendChild(option);
            });
        }
    }

    // Update counties when state changes
    stateSelect.addEventListener('change', updateCountyOptions);
});
