from flask import Flask, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)

# Load trained model
model = joblib.load("database/fare_model.pkl")

@app.route("/predict-fare", methods=["POST"])
def predict_fare():
    data = request.get_json()

    # Extract features from request
    distance = data.get("distance")
    duration = data.get("duration")
    traffic = data.get("traffic")
    seats = data.get("seats")

    # Check for missing values
    if None in [distance, duration, traffic, seats]:
        return jsonify({"error": "Missing input values"}), 400

    # Convert to numpy array for prediction
    features = np.array([[distance, duration, traffic, seats]])
    prediction = model.predict(features)[0]

    return jsonify({
        "predicted_fare": round(float(prediction), 2)
    })

if __name__ == "__main__":
    app.run(port=5001)
