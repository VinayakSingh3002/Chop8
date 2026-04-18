# recommend_service/app.py
#
# Save this file in:
#   C:\Users\vinay\Downloads\JSS_MAJOR_PROJECTfolder\recommend_service\
#
# Run with:
#   cd recommend_service
#   pip install flask flask-cors scikit-learn
#   python app.py
#
# Runs on http://localhost:5000
# Spring Boot calls POST http://localhost:5000/recommend

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import re
import math
import logging

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)

# ── Load ML model safely ──────────────────────────────────
# If the pkl files were trained with a different sklearn version,
# we catch the error and fall back to stars-only scoring.
model = None
cv    = None

try:
    model = pickle.load(open("review_model_log.pkl", "rb"))
    cv    = pickle.load(open("review_cv.pkl",         "rb"))
    app.logger.info("✅ ML model loaded successfully")
except Exception as e:
    app.logger.warning(f"⚠️  Could not load ML model: {e}")
    app.logger.warning("    Will use stars-only scoring as fallback")


# ── Text cleaning (same as training notebook) ─────────────
def clean(text):
    text = re.sub(r'<.*?>',        ' ',        text)
    text = re.sub(r"can't",        'can not',  text)
    text = re.sub(r"don't",        'do not',   text)
    text = re.sub(r"didn't",       'did not',  text)
    text = re.sub(r'[\d-]{10,12}', 'mobno',    text)
    text = re.sub(r'[^A-Za-z]',    ' ',        text)
    text = re.sub(r'\s+',          ' ',        text)
    return text.lower().strip()


# ── Predict sentiment for one review text ─────────────────
def predict_sentiment(review_text):
    """
    Returns (sentiment, score):
      sentiment = 1 → positive (good review)
      sentiment = 0 → negative (bad review)
      score = confidence 0.0 to 1.0

    If ML model not loaded, falls back to keyword matching.
    """
    if not review_text or not review_text.strip():
        return 0, 0.5   # empty comment = neutral → treated as negative

    # ── Path 1: Use trained ML model ──────────────────────
    if model is not None and cv is not None:
        try:
            cleaned    = clean(review_text)
            vectorized = cv.transform([cleaned])
            sentiment  = int(model.predict(vectorized)[0])
            score      = float(model.predict_proba(vectorized)[0][1])
            return sentiment, round(score, 3)
        except Exception as e:
            app.logger.warning(f"ML predict failed: {e} — using keyword fallback")

    # ── Path 2: Simple keyword fallback if model fails ────
    text_lower = review_text.lower()
    good_words = ["good", "great", "nice", "excellent", "amazing", "best",
                  "wonderful", "fantastic", "love", "perfect", "delicious",
                  "tasty", "helpful", "friendly", "recommend"]
    bad_words  = ["bad", "poor", "terrible", "horrible", "worst", "awful",
                  "disgusting", "rude", "slow", "not good", "disappointed",
                  "waste", "cold", "dirty", "never", "avoid"]
    pos = sum(1 for w in good_words if w in text_lower)
    neg = sum(1 for w in bad_words  if w in text_lower)
    if pos > neg:
        return 1, 0.75
    elif neg > pos:
        return 0, 0.25
    return 0, 0.5   # neutral → slight negative lean


# ── Score one chef ────────────────────────────────────────
def score_chef(chef):
    """
    Formula:
      score = 50% avg star rating
            + 20% log(review count)   ← rewards more reviews
            + 30% ML sentiment        ← positive comments boost, negative penalise

    Returns (score, positive_count, negative_count, neutral_count)
    """
    avg_rating   = float(chef.get("avgRating")  or 0)
    rating_count = int(  chef.get("ratingCount") or 0)
    reviews      =       chef.get("reviews")     or []

    # Component 1: star rating
    star_score = avg_rating * 0.50   # max = 5 × 0.5 = 2.5

    # Component 2: popularity (more reviews = more trustworthy)
    pop_score  = math.log(rating_count + 1) * 0.20

    # Component 3: ML sentiment from comment text
    pos = neg = neu = 0
    sentiment_sum = 0.0

    for review in reviews:
        comment = (review.get("comment") or "").strip()
        if comment and comment != "(no comment)":
            sentiment, confidence = predict_sentiment(comment)
            if sentiment == 1:           # positive
                pos += 1
                sentiment_sum += confidence           # add confidence as boost
            else:                        # negative
                neg += 1
                sentiment_sum -= (1.0 - confidence)  # subtract as penalty
        else:
            neu += 1   # no comment → neutral, no effect

    total = pos + neg + neu
    if total > 0:
        normalised = sentiment_sum / total
    else:
        normalised = 0.0

    sentiment_score = normalised * 0.30 * 5.0  # scale to max ~1.5

    final = star_score + pop_score + sentiment_score
    final = round(max(0.0, min(5.0, final)), 4)

    return final, pos, neg, neu


def label(score):
    if score >= 4.5: return "Highly Recommended"
    if score >= 3.5: return "Recommended"
    if score >= 2.5: return "Good"
    if score >= 1.0: return "Average"
    return "Unrated"


# ── POST /recommend ───────────────────────────────────────
# Called by Spring Boot RecommendController
# Input:  { "chefs": [ { id, name, avgRating, ratingCount, reviews: [{stars, comment}] } ] }
# Output: { "ranked": [ { id, name, recommendScore, recommendLabel, sentimentBreakdown, ... } ] }
@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json(silent=True)
    if not data or "chefs" not in data:
        return jsonify({"error": "Body must contain 'chefs' list"}), 400

    chefs = data["chefs"]
    if not isinstance(chefs, list):
        return jsonify({"error": "'chefs' must be a list"}), 400

    results = []
    for chef in chefs:
        try:
            s, pos, neg, neu = score_chef(chef)
            results.append({
                "id":             chef.get("id"),
                "name":           chef.get("name") or "",
                "specialisation": chef.get("specialisation") or "",
                "pricePerDay":    chef.get("pricePerDay") or 0,
                "avgRating":      chef.get("avgRating") or 0,
                "ratingCount":    chef.get("ratingCount") or 0,
                "recommendScore": s,
                "recommendLabel": label(s),
                "sentimentBreakdown": {
                    "positive": pos,
                    "negative": neg,
                    "neutral":  neu,
                },
            })
        except Exception as e:
            app.logger.error(f"Error scoring chef {chef.get('id')}: {e}")
            # Always include the chef even if scoring fails
            results.append({
                "id":             chef.get("id"),
                "name":           chef.get("name") or "",
                "specialisation": chef.get("specialisation") or "",
                "pricePerDay":    chef.get("pricePerDay") or 0,
                "avgRating":      chef.get("avgRating") or 0,
                "ratingCount":    chef.get("ratingCount") or 0,
                "recommendScore": float(chef.get("avgRating") or 0),
                "recommendLabel": label(float(chef.get("avgRating") or 0)),
                "sentimentBreakdown": {"positive": 0, "negative": 0, "neutral": 0},
            })

    results.sort(key=lambda c: c["recommendScore"], reverse=True)
    app.logger.info(f"Ranked {len(results)} chefs successfully")
    return jsonify({"ranked": results})


# ── POST /predict (single review test) ───────────────────
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(silent=True)
    text = (data or {}).get("review", "")
    sentiment, score = predict_sentiment(text)
    return jsonify({"sentiment": sentiment, "score": score})


# ── GET /health ───────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status":   "ok",
        "mlLoaded": model is not None and cv is not None,
    })


if __name__ == '__main__':
    app.logger.info("Starting Chop8 Recommendation Service on port 5000")
    app.run(host='0.0.0.0', port=5000, debug=True)