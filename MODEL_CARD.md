# Model Card: IPsec Sentinel Models

## 1. XGBoost Risk Classifier
- **Model Type**: XGBoost Classifier
- **Intended Use**: Classify IPsec/IKE configurations into Risk Labels (Weak, Moderate, Strong, Critical).
- **Training Data**: Synthetic parameter combinations mapping known NIST SP 800-77 Rev. 1 guidelines.
- **Features**: IKE version, Encryption Algorithm, Hash Algorithm, DH Group, Key Length, Mode, PFS, SA Lifetime.
- **Explainability**: SHAP (SHapley Additive exPlanations) is used to calculate and surface feature impact on the final prediction.

## 2. RandomForest ESP Traffic Classifier
- **Model Type**: RandomForest Classifier
- **Intended Use**: Predict the application traffic type (VoIP, Video, Web, ICMP, Email, WhatsApp) inside ESP-encrypted IPsec tunnels.
- **Training Data**: 500 synthetic PCAPs generated via strongSwan network namespaces.
- **Features**: ESP packet count, mean size, size variance, mean inter-arrival time, inter-arrival time variance, duration.
- **Limitations**: Trained solely on synthetic distributions; performance on real-world captures requires fine-tuning.

## 3. IsolationForest ESP Anomaly Detector
- **Model Type**: Isolation Forest
- **Intended Use**: Detect anomalous traffic patterns within ESP tunnels.
- **Training Data**: Same ESP feature sets as the RandomForest classifier, with an assumed contamination rate of 10%.
