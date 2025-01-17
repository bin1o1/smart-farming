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
            // alert(result.message);
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

// Websocket for controlling of motors and stuff
let ws = new WebSocket("wss://smart-farming-dashboard.azurewebsites.net/ws");

// WebSocket message handling
ws.onmessage = function(event) {
    console.log("ESP32 says: " + event.data);
};

// Store timers and intervals
const autoOffTimers = {};
const countdownIntervals = {};

// Function to toggle devices
function toggleDevice(device, checkbox) {
    let message = checkbox.checked ? `${device}_ON` : `${device}_OFF`;
    console.log(message);

    const statusList = document.getElementById('device-status-list'); // Device status updates container
    const deviceStatus = document.getElementById('device-status'); // Device status section
    const deviceHistoryList = document.getElementById('device-history-list'); // History list

    // Show the device-status container if a device is toggled on
    deviceStatus.style.display = 'block';

    if (checkbox.checked) {
        // Create a unique identifier for the device
        const deviceId = `device-${device}`;

        // Check if the device is already in the list
        if (!document.getElementById(deviceId)) {
            // Create a new list item for the device
            const listItem = document.createElement('li');
            listItem.id = deviceId;

            // Get the current time
            const currentTime = new Date().toLocaleTimeString();

            // Set the initial text content
            listItem.innerHTML = `
                ${device} turned ON at ${currentTime}
                <span id="time-remaining-${device}" style="margin-left: 10px; color: green; font-weight: bold;"></span>
            `;

            // Append the new list item to the status list
            statusList.appendChild(listItem);
        }

        // Clear any existing auto-off timer and countdown interval for this device
        if (autoOffTimers[device]) {
            clearTimeout(autoOffTimers[device]);
        }
        if (countdownIntervals[device]) {
            clearInterval(countdownIntervals[device]);
        }

        // Set a new timer to turn off the device after a certain period (e.g., 5 minutes)
        const autoOffDuration = 300000; // 300,000ms = 5 minutes
        const endTime = Date.now() + autoOffDuration;

        autoOffTimers[device] = setTimeout(() => {
            // Turn off the device
            checkbox.checked = false;
            toggleDevice(device, checkbox); // Recursively call to handle turning off
            console.log(`${device} turned OFF automatically after timeout.`);
        }, autoOffDuration);

        // Start the countdown interval for the time remaining
        const timeRemainingElement = document.getElementById(`time-remaining-${device}`);
        countdownIntervals[device] = setInterval(() => {
            const remainingTime = endTime - Date.now();
            if (remainingTime <= 0) {
                clearInterval(countdownIntervals[device]);
                timeRemainingElement.textContent = ''; // Clear the countdown when time is up
            } else {
                // Update the time remaining in minutes and seconds
                const minutes = Math.floor(remainingTime / 60000);
                const seconds = Math.floor((remainingTime % 60000) / 1000);
                timeRemainingElement.textContent = `Time remaining: ${minutes}m ${seconds}s`;
            }
        }, 1000); // Update every second
    } else {
        // Remove the device's list item if it is turned off
        const deviceItem = document.getElementById(`device-${device}`);
        if (deviceItem) {
            statusList.removeChild(deviceItem);
        }

        // Clear the auto-off timer and countdown interval if the device is manually turned off
        if (autoOffTimers[device]) {
            clearTimeout(autoOffTimers[device]);
            delete autoOffTimers[device];
        }
        if (countdownIntervals[device]) {
            clearInterval(countdownIntervals[device]);
            delete countdownIntervals[device];
        }
    }

    // Record device history
    const currentTime = new Date().toLocaleTimeString();
    if (checkbox.checked) {
        document.getElementById('device-history').style.display = 'block'
        // Add to history when the device is turned ON
        const historyItem = document.createElement('li');
        historyItem.id = `history-${device}`;
        historyItem.innerHTML = `
            ${device} turned ON at ${currentTime}
        `;
        deviceHistoryList.appendChild(historyItem);
    } else {
        // Update history when the device is turned OFF
        const historyItem = document.getElementById(`history-${device}`);
        if (historyItem) {
            historyItem.innerHTML += `
                and turned OFF at ${currentTime}
            `;
        }
    }

    // Check if the list is empty and hide the device-status section if it is
    if (statusList.children.length === 0) {
        deviceStatus.style.display = 'none'; // Hide the status section if empty
    }

    // Send the message via WebSocket
    ws.send(message);
}

