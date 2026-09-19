# EDA & Model Training Report

## Dataset Overview
Total rows: 5000

### Class Balance
- **Critical**: 28.30%
- **Moderate**: 25.92%
- **Weak**: 25.92%
- **Strong**: 19.86%

### Correlations with Risk Score
- sa_lifetime_seconds: -0.00
- dh_group: -0.38
- key_length_bits: -0.45

## Model Evaluation
- **XGBoost Accuracy**: 0.8760
- **Random Forest Accuracy**: 0.8840

### XGBoost Classification Report
```text
              precision    recall  f1-score   support

    Critical       0.99      0.96      0.97       283
    Moderate       0.81      0.75      0.78       259
      Strong       0.91      0.99      0.95       199
        Weak       0.79      0.82      0.81       259

    accuracy                           0.88      1000
   macro avg       0.88      0.88      0.88      1000
weighted avg       0.88      0.88      0.88      1000

```

### SHAP Feature Importance
![SHAP Summary](file:///d:/Antigravity/SIH/shap_summary.png)