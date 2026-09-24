import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, classification_report
import joblib

df = pd.read_csv("backend/data/ipsec_synthetic_dataset.csv")

X = df.drop(['session_id', 'risk_score', 'risk_label', 'flagged_issues'], axis=1)
y = df['risk_label']

preprocessor = joblib.load('backend/models/preprocessor.joblib')
label_encoder = joblib.load('backend/models/label_encoder.joblib')
model = joblib.load('backend/models/xgb_model.joblib')

y_encoded = label_encoder.transform(y)
X_processed = preprocessor.transform(X)

X_train, X_test, y_train, y_test = train_test_split(X_processed, y_encoded, test_size=0.2, stratify=y_encoded, random_state=101)

preds = model.predict(X_test)

print("Confusion Matrix:")
cm = confusion_matrix(y_test, preds)
print(cm)
print("\nClassification Report:")
print(classification_report(y_test, preds, target_names=label_encoder.classes_))
