import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.utils.class_weight import compute_sample_weight

df = pd.read_csv("backend/data/ipsec_synthetic_dataset.csv")
# Drop duplicates based on features and label
df_dedup = df.drop_duplicates(subset=['ike_version', 'ike_mode', 'encryption_algorithm', 'hash_algorithm', 'auth_method', 'operation_mode', 'key_length_bits', 'dh_group', 'sa_lifetime_seconds', 'pfs_enabled', 'risk_label'])

print(f"Original rows: {len(df)}, Deduped rows: {len(df_dedup)}")

X = df_dedup.drop(['session_id', 'risk_score', 'risk_label', 'flagged_issues'], axis=1)
y = df_dedup['risk_label']

le = LabelEncoder()
y_encoded = le.fit_transform(y)

cat_cols = ['ike_version', 'ike_mode', 'encryption_algorithm', 'hash_algorithm', 'auth_method', 'operation_mode']
num_cols = ['key_length_bits', 'dh_group', 'sa_lifetime_seconds']
bool_cols = ['pfs_enabled']

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), num_cols),
        ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols),
        ('bool', 'passthrough', bool_cols)
    ]
)

X_processed = preprocessor.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(X_processed, y_encoded, test_size=0.2, stratify=y_encoded, random_state=101)

sample_weights = compute_sample_weight('balanced', y_train)
xgb_base = XGBClassifier(eval_metric='mlogloss', random_state=101, max_depth=8, learning_rate=0.1, n_estimators=300)
xgb_base.fit(X_train, y_train, sample_weight=sample_weights)

xgb_calibrated = CalibratedClassifierCV(estimator=xgb_base, method='sigmoid', cv=5)
xgb_calibrated.fit(X_train, y_train, sample_weight=sample_weights)

preds = xgb_calibrated.predict(X_test)
acc = accuracy_score(y_test, preds)
print(f"Corrected XGBoost Accuracy: {acc*100:.1f}%")
