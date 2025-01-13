from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from datetime import datetime
from urllib.parse import unquote

app = FastAPI()

# Mount static files for serving HTML, CSS, and JS
app.mount("/static", StaticFiles(directory="static"), name="static")

# Enable CORS to allow API requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load data
data = pd.read_csv('final_data2.csv')

@app.get("/")
def read_root():
    # Serve the main HTML file
    return FileResponse("static/index.html")

@app.get("/predict/{commodity_val}")
def predict_price(commodity_val: str):
    try:
        # Decode the commodity value
        commodity_val = unquote(commodity_val)
        
        # Debugging: Log the commodity being processed
        print(f"Received request for commodity: {commodity_val}")
        
        # Validate the commodity value
        if commodity_val not in list(data['Commodity']):
            raise HTTPException(status_code=400, detail="Commodity not found")
        
        # Filter data for the given commodity
        df2 = data[data['Commodity'] == commodity_val].copy()
        starting_index = df2.iloc[0, 0]
        final_index = df2.iloc[-1, 0]
        data_filtered = data[starting_index:final_index]

        # Process data
        data_filtered['Date'] = pd.to_datetime(data_filtered['Date'], errors='coerce')
        data_filtered = data_filtered.dropna(subset=['Date'])
        data_filtered.set_index('Date', inplace=True)
        prices = data_filtered['Average']

        # Fit ARIMA model
        model = ARIMA(prices, order=(1, 1, 1))  # Adjust order as needed
        model_fit = model.fit()

        # Forecast the next 20 days
        forecast_steps = 3
        forecast = model_fit.forecast(steps=forecast_steps)

        # Use the last valid date in the dataset for forecasting
        last_date = prices.index[-1]
        future_dates = pd.date_range(start=last_date, periods=forecast_steps + 1, freq='D')[1:]

        # Debugging: Log forecast data
        print(f"Forecast dates: {future_dates}")
        print(f"Forecast prices: {forecast.tolist()}")

        forecast_dict = {"dates": [str(date.date()) for date in future_dates], "predicted_prices": forecast.tolist()}
        result = dict(zip(forecast_dict["dates"], forecast_dict["predicted_prices"]))

        # Debugging: Log the final result
        print(f"Prediction result: {result}")

        return result

    except Exception as e:
        # Log the error for debugging
        print(f"Error occurred: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
