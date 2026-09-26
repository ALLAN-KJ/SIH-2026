import sys
sys.path.append('backend')
from backend.esp_traffic_classifier import predict_traffic
import pandas as pd
try:
    df = pd.read_csv('backend/data/ipsec_synthetic_dataset.csv')
    X = df.drop(columns=['label'])
    y = df['label']
    
    # We just need to check the accuracy using the classifier logic
    from sklearn.ensemble import IsolationForest
    import joblib
    
    try:
        model = joblib.load('backend/models/esp_isolation_forest.pkl')
        y_pred = model.predict(X)
        y_pred = [1 if p == -1 else 0 for p in y_pred]
        
        correct = sum([1 for p, t in zip(y_pred, y) if p == t])
        acc = correct / len(y) * 100
        print(f"Current ESP Classification Accuracy: {acc:.2f}%")
    except Exception as e:
        print(f"Error evaluating model: {e}")
except Exception as e:
    print(f"Failed to load dataset: {e}")
