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
