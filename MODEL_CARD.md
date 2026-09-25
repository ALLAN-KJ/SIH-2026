# Model Card: IPsec VPN Protocol Analyzer Models

## 1. XGBoost Risk Classifier
- **Model Type**: XGBoost Classifier + CalibratedClassifierCV
- **Intended Use**: Classify IPsec/IKE configurations into Risk Labels (Low, Weak, Moderate, Strong, Critical).
- **Training Data**: Synthetic parameter combinations mapping known NIST SP 800-77 Rev. 1 guidelines (5,000 generated scenarios).
- **Features**: IKE version, Encryption Algorithm, Hash Algorithm, DH Group, Key Length, Mode, PFS, SA Lifetime.
- **Performance**: Achieves **84% overall accuracy** across all 5 classes on a strict held-out test set.
  - **Confusion Matrix:**
    ```text
    [[223   0   0   0  18]   (Critical)
     [  0 120   0  25   0]   (Low)
     [  0   0 199  18  16]   (Moderate)
     [  0  33  17 154   0]   (Strong)
     [ 12   0  16   0 149]]  (Weak)
    ```
  - **Precision/Recall by Class:**
    ```text
                  precision    recall  f1-score   support
        Critical       0.95      0.93      0.94       241
             Low       0.78      0.83      0.81       145
        Moderate       0.86      0.85      0.86       233
          Strong       0.78      0.75      0.77       204
            Weak       0.81      0.84      0.83       177
    ```
- **Confidence Scoring**: Platt Scaling (sigmoid) is used to calculate realistic true-probability confidence scores, resolving raw tree overconfidence.
- **Explainability**: SHAP (SHapley Additive exPlanations) is evaluated on the base estimator to calculate and surface feature impact on the final prediction.

## 2. RandomForest ESP Traffic Classifier
- **Model Type**: RandomForest Classifier
- **Intended Use**: Predict the application traffic type (VoIP, Video, Web, ICMP, Email, WhatsApp) inside ESP-encrypted IPsec tunnels.
- **Training Data**: 500 synthetic PCAPs generated via strongSwan network namespaces.
- **Features**: ESP packet count, mean size, size variance, mean inter-arrival time, inter-arrival time variance, duration.
- **Performance**: Achieves **100.00% accuracy** on a strict held-out Train/Test split across 6 classes (verified in Ground-Truth Audit).
- **Limitations**: Trained solely on synthetic distributions; performance on real-world captures requires fine-tuning.

## 3. IsolationForest ESP Anomaly Detector
- **Model Type**: Isolation Forest
- **Intended Use**: Detect anomalous traffic patterns within ESP tunnels.
- **Training Data**: Same ESP feature sets as the RandomForest classifier, with an assumed contamination rate of 10%.
