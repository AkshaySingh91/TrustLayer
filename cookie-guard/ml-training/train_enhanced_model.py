import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.multioutput import MultiOutputClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import json

print("🤖 Enhanced Cookie Classification Model Training")
print("=" * 50)

# Step 1: Load enhanced dataset
print("📊 Loading enhanced cookie dataset...")
df = pd.read_csv("enhanced_cookies.csv")
print(f"✅ Loaded {len(df)} cookie samples with enhanced features")

# Step 2: Prepare features and labels
X = df['name']  # Cookie names as features
y_purpose = df['purpose']  # Purpose classification
y_risk = df['risk_level']  # Risk level classification
y_security = df['security_impact']  # Security impact
y_privacy = df['privacy_impact']  # Privacy impact

print(f"📈 Features: {len(X)} cookie names")
print(f"🎯 Labels: Purpose, Risk Level, Security Impact, Privacy Impact")

# Step 3: Enhanced text vectorization
print("🔤 Creating enhanced text features...")
vectorizer = TfidfVectorizer(
    analyzer='char_wb',  # Character n-grams for better cookie name analysis
    ngram_range=(2, 4),  # 2-4 character patterns
    min_df=1,  # Include all patterns
    lowercase=True
)
X_vectorized = vectorizer.fit_transform(X)
print(f"✅ Created {X_vectorized.shape[1]} text features")

# Step 4: Prepare multi-output labels
y_combined = np.column_stack([
    pd.LabelEncoder().fit_transform(y_purpose),
    pd.LabelEncoder().fit_transform(y_risk), 
    pd.LabelEncoder().fit_transform(y_security),
    pd.LabelEncoder().fit_transform(y_privacy)
])

# Create label encoders for decoding
purpose_encoder = pd.LabelEncoder().fit(y_purpose)
risk_encoder = pd.LabelEncoder().fit(y_risk)
security_encoder = pd.LabelEncoder().fit(y_security)
privacy_encoder = pd.LabelEncoder().fit(y_privacy)

print("🏷️ Label encoding complete")

# Step 5: Split data for training and validation
X_train, X_test, y_train, y_test = train_test_split(
    X_vectorized, y_combined, test_size=0.2, random_state=42
)
print(f"📚 Training set: {X_train.shape[0]} samples")
print(f"🧪 Test set: {X_test.shape[0]} samples")

# Step 6: Train enhanced multi-output model
print("🚀 Training enhanced Random Forest model...")
model = MultiOutputClassifier(RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42,
    class_weight='balanced'  # Handle imbalanced classes
))

model.fit(X_train, y_train)
print("✅ Model training complete!")

# Step 7: Evaluate model performance
print("📊 Evaluating model performance...")
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"🎯 Overall Accuracy: {accuracy:.3f}")

# Individual accuracy for each output
for i, label_name in enumerate(['Purpose', 'Risk Level', 'Security Impact', 'Privacy Impact']):
    acc = accuracy_score(y_test[:, i], y_pred[:, i])
    print(f"   {label_name}: {acc:.3f}")

# Step 8: Save model and components
print("💾 Saving enhanced model and components...")
joblib.dump(model, 'enhanced_cookie_classifier.joblib')
joblib.dump(vectorizer, 'enhanced_vectorizer.joblib')
joblib.dump(purpose_encoder, 'purpose_encoder.joblib')
joblib.dump(risk_encoder, 'risk_encoder.joblib')
joblib.dump(security_encoder, 'security_encoder.joblib')
joblib.dump(privacy_encoder, 'privacy_encoder.joblib')

# Step 9: Create enhanced prediction map with detailed information
print("🗺️ Creating enhanced prediction map...")
enhanced_prediction_map = {}

for _, row in df.iterrows():
    cookie_name = row['name']
    enhanced_prediction_map[cookie_name] = {
        'purpose': row['purpose'],
        'risk_level': row['risk_level'],
        'security_impact': row['security_impact'],
        'privacy_impact': row['privacy_impact']
    }

# Save enhanced prediction map
with open('enhanced_cookie_prediction_map.json', 'w') as f:
    json.dump(enhanced_prediction_map, f, indent=2)

print(f"✅ Enhanced prediction map saved with {len(enhanced_prediction_map)} entries")

# Step 10: Test model with sample predictions
print("🧪 Testing enhanced model with sample cookies...")
test_cookies = ['_ga', 'sessionid', 'authToken', 'csrf_token', 'unknown_cookie']

for cookie in test_cookies:
    try:
        cookie_vector = vectorizer.transform([cookie])
        prediction = model.predict(cookie_vector)[0]
        
        purpose = purpose_encoder.inverse_transform([prediction[0]])[0]
        risk = risk_encoder.inverse_transform([prediction[1]])[0] 
        security = security_encoder.inverse_transform([prediction[2]])[0]
        privacy = privacy_encoder.inverse_transform([prediction[3]])[0]
        
        print(f"🍪 {cookie}:")
        print(f"   Purpose: {purpose}")
        print(f"   Risk Level: {risk}")
        print(f"   Security Impact: {security}")
        print(f"   Privacy Impact: {privacy}")
        print()
    except Exception as e:
        print(f"❌ Error predicting {cookie}: {e}")

# Step 11: Generate model statistics
print("📈 Enhanced Model Statistics:")
print(f"   Total training samples: {len(df)}")
print(f"   Unique purposes: {len(df['purpose'].unique())}")
print(f"   Risk levels: {list(df['risk_level'].unique())}")
print(f"   Feature dimensions: {X_vectorized.shape[1]}")
print(f"   Model complexity: Random Forest with {model.estimators_[0].n_estimators} trees")

print("\n🎉 Enhanced cookie classification model training complete!")
print("🔧 Files generated:")
print("   - enhanced_cookie_classifier.joblib")
print("   - enhanced_vectorizer.joblib") 
print("   - purpose_encoder.joblib")
print("   - risk_encoder.joblib")
print("   - security_encoder.joblib")
print("   - privacy_encoder.joblib")
print("   - enhanced_cookie_prediction_map.json")

print("\n🚀 Ready for enhanced cookie security analysis!")