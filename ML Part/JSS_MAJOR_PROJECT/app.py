from flask import Flask, request, jsonify
import pickle
import re
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allows Spring Boot to call this API

# Load model and vectorizer
model = pickle.load(open("review_model_log.pkl", "rb"))
cv    = pickle.load(open("review_cv.pkl", "rb"))

# Same clean function from your notebook
def clean(x):
    x = re.sub(r'<.*?>', ' ', x)
    x = re.sub(r"can't", 'can not', x)
    x = re.sub(r"don't", 'do not', x)
    x = re.sub(r"didn't", 'did not', x)
    x = re.sub(r'[\d-]{10,12}', 'mobno', x)
    x = re.sub(r'[^A-Za-z]', ' ', x)
    x = re.sub(r'\s+', ' ', x)
    return x.lower()

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    review_text = data.get('review', '')

    # Clean and vectorize
    cleaned = clean(review_text)
    vectorized = cv.transform([cleaned])

    # Predict
    sentiment = int(model.predict(vectorized)[0])
    score = float(model.predict_proba(vectorized)[0][1])  # confidence score

    return jsonify({
        "sentiment": sentiment,   # 0 = bad, 1 = good
        "score": round(score, 2)  # e.g. 0.87
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)