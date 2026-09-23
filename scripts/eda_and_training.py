import pandas as pd
import numpy as np
import shap
import matplotlib.pyplot as plt

from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
import joblib
import json

def main():
    print("Loading dataset...")
    df = pd.read_csv("backend/data/ipsec_synthetic_dataset.csv")
    
    # ---------------------------
    # Step 1: EDA
    # ---------------------------
    print("Performing EDA...")
    eda_report = []
    eda_report.append("# EDA & Model Training Report\n")
    eda_report.append("## Dataset Overview")
    eda_report.append(f"Total rows: {len(df)}")
    
    # Class balance
    balance = df['risk_label'].value_counts(normalize=True) * 100
    eda_report.append("\n### Class Balance")
    for k, v in balance.items():
        eda_report.append(f"- **{k}**: {v:.2f}%")
        
    # Is risk_score deterministic?
    # Yes, by our generation rules. Let's show correlation
    eda_report.append("\n### Correlations with Risk Score")
    df_numeric = df.select_dtypes(include=[np.number])
    corr = df_numeric.corr()['risk_score'].sort_values(ascending=False)
    for k, v in corr.items():
        if k != 'risk_score':
            eda_report.append(f"- {k}: {v:.2f}")

    # ---------------------------
    # Step 2: Risk Classification Model
    # ---------------------------
    print("Preparing data for modeling...")
    
    # Features & Target
    X = df.drop(['session_id', 'risk_score', 'risk_label', 'flagged_issues'], axis=1)
    y = df['risk_label']
    
    # Label encode target
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    # Categorical and numerical columns
    cat_cols = ['ike_version', 'ike_mode', 'encryption_algorithm', 'hash_algorithm', 'auth_method', 'operation_mode']
    num_cols = ['key_length_bits', 'dh_group', 'sa_lifetime_seconds']
    bool_cols = ['pfs_enabled']
    
    # Preprocessor
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols),
            ('bool', 'passthrough', bool_cols)
        ]
    )
    
    X_processed = preprocessor.fit_transform(X)
    
    # Get feature names after one-hot encoding
    cat_feature_names = preprocessor.named_transformers_['cat'].get_feature_names_out(cat_cols)
    feature_names = num_cols + list(cat_feature_names) + bool_cols
    
    # Train test split (Stratified)
    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(X_processed, y_encoded, test_size=0.2, stratify=y_encoded, random_state=42)
    
    print("Training XGBoost Classifier...")
    from sklearn.calibration import CalibratedClassifierCV
    xgb_base = XGBClassifier(eval_metric='mlogloss', random_state=42, max_depth=2, learning_rate=0.05, reg_alpha=10, reg_lambda=10, n_estimators=50)
    xgb_base.fit(X_train, y_train)
    
    xgb_calibrated = CalibratedClassifierCV(estimator=xgb_base, method='sigmoid', cv=5)
    xgb_calibrated.fit(X_train, y_train)
    
    print("Training Random Forest...")
    rf = RandomForestClassifier(random_state=42)
    rf.fit(X_train, y_train)
    
    # Evaluation
    from sklearn.metrics import accuracy_score, classification_report
    xgb_preds = xgb_calibrated.predict(X_test)
    rf_preds = rf.predict(X_test)
    
    xgb_acc = accuracy_score(y_test, xgb_preds)
    rf_acc = accuracy_score(y_test, rf_preds)
    
    eda_report.append("\n## Model Evaluation")
    eda_report.append(f"- **XGBoost Accuracy**: {xgb_acc:.4f}")
    eda_report.append(f"- **Random Forest Accuracy**: {rf_acc:.4f}")
    
    eda_report.append("\n### XGBoost Classification Report")
    eda_report.append("```text\n" + classification_report(y_test, xgb_preds, target_names=le.classes_) + "\n```")
    
    # SHAP Explainer
    print("Calculating SHAP values...")
    explainer = shap.TreeExplainer(xgb_base)
    shap_values = explainer.shap_values(X_test)
    
    # Save SHAP Summary Plot
    plt.figure()
    # For multi-class, shap_values is a list of arrays. We plot for the first class as example or summary.
    if isinstance(shap_values, list):
        shap.summary_plot(shap_values, X_test, feature_names=feature_names, show=False)
    else:
        # xgboost >= 2.0 output might be 3D array (samples, features, classes)
        # fallback for plotting
        shap.summary_plot(shap_values, X_test, feature_names=feature_names, show=False)
        
    plt.savefig("shap_summary.png", bbox_inches='tight')
    
    eda_report.append("\n### SHAP Feature Importance")
    eda_report.append("![SHAP Summary](file:///d:/Antigravity/SIH/shap_summary.png)")
    
    # Export Models
    print("Exporting models...")
    import os
    os.makedirs("backend/models", exist_ok=True)
    joblib.dump(preprocessor, "backend/models/preprocessor.joblib")
    joblib.dump(xgb_base, "backend/models/xgb_model.joblib")
    joblib.dump(xgb_calibrated, "backend/models/xgb_calibrated.joblib")
    joblib.dump(le, "backend/models/label_encoder.joblib")
    joblib.dump(feature_names, "backend/models/feature_names.joblib")
    
    # Write EDA artifact
    with open("eda_report.md", "w") as f:
        f.write("\n".join(eda_report))
        
    print("Done! Artifacts saved.")

if __name__ == "__main__":
    main()

