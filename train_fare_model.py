import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
import joblib

# Load data
df = pd.read_csv("database/rides_data.csv")

# Define features (X) and target (y)
X = df[['Distance_km', 'Duration_min', 'Traffic_Level', 'Seats']]
y = df['Final_Fare']

# Split into training and testing data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = LinearRegression()
model.fit(X_train, y_train)

# Save trained model
joblib.dump(model, "database/fare_model.pkl")

print("✅ Model trained and saved as fare_model.pkl successfully!")
print("Training Score:", model.score(X_train, y_train))
print("Testing Score:", model.score(X_test, y_test))
