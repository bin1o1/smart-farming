from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from datetime import datetime, timedelta
from urllib.parse import unquote
from pydantic import BaseModel

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Crop(BaseModel):
    name: str
    planting_date: str
    harvest_duration: int

def load_crop_data():
    try:
        return pd.read_csv('crops_data.csv')
    except FileNotFoundError:
        return pd.DataFrame(columns=["name", "planting_date", "harvest_duration", "harvest_date", "days_remaining"])

def add_crop_to_csv(crop_name, planting_date, harvest_duration):
    crop_data = load_crop_data()
    planting_date = datetime.strptime(planting_date, "%Y-%m-%d")
    harvest_date = planting_date + timedelta(days=harvest_duration)
    new_crop = pd.DataFrame([{
        'Crop Name': crop_name,
        'Planting Date': planting_date,
        'Harvest Duration': harvest_duration,
        'Harvest Date': harvest_date,
        'Days Remaining': (harvest_date - datetime.now()).days
    }])

    crop_data = pd.concat([crop_data, new_crop], ignore_index=True)

    crop_data.to_csv('crops_data.csv', index=False)

def update_days_remaining():
    crop_data = load_crop_data()
    crop_data['Harvest Date'] = crop_data['Harvest Date'].apply(lambda x: x.split()[0])
    crop_data['Days Remaining'] = crop_data['Harvest Date'].apply(lambda x: (datetime.strptime(x, "%Y-%m-%d") - datetime.now()).days)
    crop_data.to_csv('crops_data.csv', index=False)


# Load data
data = pd.read_csv('final_data2.csv')

@app.get("/")
def read_root():
    return FileResponse("static/index.html")

@app.get("/predict/{commodity_val}")
def predict_price(commodity_val: str):
    try:
        commodity_val = unquote(commodity_val).lower()
        
        print(f"Received request for commodity: {commodity_val}")
        
        if commodity_val not in list(data['Commodity']):
            raise HTTPException(status_code=400, detail="Commodity not found")
        
        df2 = data[data['Commodity'] == commodity_val].copy()
        starting_index = df2.iloc[0, 0]
        final_index = df2.iloc[-1, 0]
        data_filtered = data[starting_index:final_index]

        data_filtered['Date'] = pd.to_datetime(data_filtered['Date'], errors='coerce')
        data_filtered = data_filtered.dropna(subset=['Date'])
        data_filtered.set_index('Date', inplace=True)
        prices = data_filtered['Average']

        model = ARIMA(prices, order=(1, 1, 1))  
        model_fit = model.fit()

        forecast_steps = 3
        forecast = model_fit.forecast(steps=forecast_steps)

        last_date = prices.index[-1]
        future_dates = pd.date_range(start=last_date, periods=forecast_steps + 1, freq='D')[1:]

        print(f"Forecast dates: {future_dates}")
        print(f"Forecast prices: {forecast.tolist()}")

        forecast_dict = {"dates": [str(date.date()) for date in future_dates], "predicted_prices": forecast.tolist()}
        result = dict(zip(forecast_dict["dates"], forecast_dict["predicted_prices"]))

        print(f"Prediction result: {result}")

        return result

    except Exception as e:
        print(f"Error occurred: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred")


@app.post("/add_crop/")
async def add_crop(crop: Crop):
    try:
        add_crop_to_csv(crop.name, crop.planting_date, crop.harvest_duration)
        return {"message": "Crop added successfully!"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/get_crops/")
async def get_crops():
    update_days_remaining()
    crop_data = load_crop_data()
    return {"crops": crop_data.to_dict(orient="records")}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
