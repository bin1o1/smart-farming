// Function to update temperature and humidity (remains the same)
function updateEnvironment() {
    // Update temperature and humidity with mock data
    document.getElementById('temperature').textContent = `28°C`;
    document.getElementById('humidity').textContent = `65%`;
}

// Function to search for commodity price prediction
async function searchCommodityPrice() {
    const commodity = document.getElementById('commodity-search').value.trim();
    const pricePredictionSection = document.getElementById('price-prediction');
    const priceList = document.getElementById('price-list');
    const pricePredictionTitle = document.getElementById('price-prediction-title')
    // Check if commodity search is empty
    if (!commodity) {
        pricePredictionSection.style.display = 'none'
        alert('Please enter a commodity name!');
        return;
    }

    // Show the price prediction section
    pricePredictionSection.style.display = 'block';
    pricePredictionTitle.textContent = `Predicted prices of ${commodity} for the next 3 days:`
    
    // Clear any previous predictions
    priceList.innerHTML = '';

    try {
        // Log the commodity being searched
        console.log('Fetching data for:', commodity);

        // Make the API call to get the predicted prices (encode the commodity name)
        const response = await fetch(`https://smart-farming-dashboard.azurewebsites.net/predict/${encodeURIComponent(commodity)}`);
        
        // Log the response status for debugging
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error('Commodity not found!');
        }

        const data = await response.json();


        // Display the predictions in a nice format
        const dates = Object.keys(data);
        const prices = Object.values(data);
        
        // Loop through the predictions and display them
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

// Event listeners
document.getElementById('update-environment-btn').addEventListener('click', updateEnvironment);
document.getElementById('search-btn').addEventListener('click', searchCommodityPrice);
