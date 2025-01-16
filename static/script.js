function updateEnvironment() {
    document.getElementById('temperature').textContent = `28°C`;
    document.getElementById('humidity').textContent = `65%`;
}

async function searchCommodityPrice() {
    const commodity = document.getElementById('commodity-search').value.trim();
    const pricePredictionSection = document.getElementById('price-prediction');
    const priceList = document.getElementById('price-list');
    const pricePredictionTitle = document.getElementById('price-prediction-title')

    if (!commodity) {
        pricePredictionSection.style.display = 'none'
        alert('Please enter a commodity name!');
        return;
    }

    pricePredictionSection.style.display = 'block';
    pricePredictionTitle.textContent = `Predicted prices of ${commodity} for the next 3 days:`
    
    priceList.innerHTML = '';

    try {
        
        console.log('Fetching data for:', commodity);

        const response = await fetch(`https://smart-farming-dashboard.azurewebsites.net/predict/${encodeURIComponent(commodity)}`);
        
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error('Commodity not found!');
        }

        const data = await response.json();

        const dates = Object.keys(data);
        const prices = Object.values(data);
        
        dates.forEach((date, index) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<strong>${date}:</strong> Rs.${prices[index].toFixed(2)} per kg`;
            priceList.appendChild(listItem);
        });
    } catch (error) {
        // Log the error for debugging
        // alert(error.message);
        pricePredictionTitle.textContent = error.message
    }
}

document.getElementById('update-environment-btn').addEventListener('click', updateEnvironment);
document.getElementById('search-btn').addEventListener('click', searchCommodityPrice);


document.addEventListener("DOMContentLoaded", function () {
    // Function to fetch and display the current crops
    async function loadCrops() {
        const response = await fetch('https://smart-farming-dashboard.azurewebsites.net/get_crops/');
        const data = await response.json();
        const cropsList = document.getElementById("crops-list");
        cropsList.innerHTML = ""; // Clear the list before adding new crops
        data.crops.forEach(crop => {
            const li = document.createElement("li");
            li.textContent = `${crop["Crop Name"]} (Planted on: ${crop["Planting Date"]}) - Harvest in: ${crop["Days Remaining"]} days`;
            cropsList.appendChild(li); // Append each crop to the list
        });
    }

    // Function to add a new crop
    document.getElementById("add-crop-form").addEventListener("submit", async function (event) {
        event.preventDefault(); // Prevent form submission

        const cropName = document.getElementById("crop-name").value;
        const plantingDate = document.getElementById("planting-date").value;
        const harvestDuration = document.getElementById("harvest-duration").value;

        // Send POST request to add the new crop
        const response = await fetch('https://smart-farming-dashboard.azurewebsites.net/add_crop/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: cropName,
                planting_date: plantingDate,
                harvest_duration: parseInt(harvestDuration)
            })
        });

        const result = await response.json();

        if (result.message) {
            alert(result.message);
            loadCrops(); // Reload the crops list after adding a new crop
        } else {
            alert("Error: " + result.error);
        }

        // Clear form fields
        document.getElementById("crop-name").value = '';
        document.getElementById("planting-date").value = '';
        document.getElementById("harvest-duration").value = '';
    });

    // Load crops when the page is loaded
    loadCrops();

    
});
