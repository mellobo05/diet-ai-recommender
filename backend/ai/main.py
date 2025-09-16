from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import os

# Provider configuration
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "google").lower()
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-1.5-flash")

# OpenAI client (optional)
openai_client = None
if LLM_PROVIDER == "openai":
    try:
        from openai import OpenAI
        openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    except Exception:
        openai_client = None

# Google Gemini client (optional)
gemini_model = None
if LLM_PROVIDER == "google":
    try:
        import google.generativeai as genai
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            gemini_model = genai.GenerativeModel(LLM_MODEL or "gemini-1.5-flash")
    except Exception:
        gemini_model = None

# Hugging Face transformers (backup option)
hf_pipeline = None
if LLM_PROVIDER == "huggingface":
    try:
        from transformers import pipeline
        model_name = LLM_MODEL or "microsoft/DialoGPT-medium"
        hf_pipeline = pipeline("text-generation", model=model_name, max_length=50)
    except Exception:
        hf_pipeline = None

app = FastAPI(title="Diet Classifier Service")

class Nutrition(BaseModel):
    calories: Optional[int] = None
    proteinGrams: Optional[float] = None
    fatGrams: Optional[float] = None
    carbsGrams: Optional[float] = None

class ProductIn(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    keywords: List[str] = []
    nutrition: Nutrition

class BatchRequest(BaseModel):
    products: List[ProductIn]

class BatchResult(BaseModel):
    id: str
    is_diet: bool
    reason: Optional[str] = None

class BatchResponse(BaseModel):
    results: List[BatchResult]

KEYWORD_BAD = {"candy", "sugar", "sugary", "soda", "fried", "donut", "cookie", "cake", "chips", "beer"}
KEYWORD_GOOD = {"salad", "protein", "lean", "low-fat", "low carb", "keto", "whole grain", "oats", "nuts", "yogurt"}


def heuristic_is_diet(p: ProductIn) -> (bool, str):
    kw = " ".join([p.title, p.description or "", " ".join(p.keywords)]).lower()
    bad_hits = [w for w in KEYWORD_BAD if w in kw]
    good_hits = [w for w in KEYWORD_GOOD if w in kw]

    cal = p.nutrition.calories or 0
    protein = p.nutrition.proteinGrams or 0
    fat = p.nutrition.fatGrams or 0
    carbs = p.nutrition.carbsGrams or 0

    score = 0.0
    score += -1.0 * len(bad_hits)
    score += 0.6 * len(good_hits)
    score += - (cal / 800.0)  # fewer calories better
    score += (protein / 50.0) # more protein better
    score += - (fat / 70.0)
    score += - (carbs / 200.0)

    is_diet = score > -0.1
    reason = f"bad={bad_hits}, good={good_hits}, score={round(score,3)}"
    return is_diet, reason


def llm_filter_if_enabled(p: ProductIn, proposed: bool) -> Optional[bool]:
    prompt = (
        "Decide if the product is generally healthy for a diet. "
        "Reply with only 'yes' or 'no'.\n"
        f"Title: {p.title}\n"
        f"Description: {p.description}\n"
        f"Keywords: {', '.join(p.keywords)}\n"
        f"Nutrition: calories={p.nutrition.calories}, protein={p.nutrition.proteinGrams}, fat={p.nutrition.fatGrams}, carbs={p.nutrition.carbsGrams}\n"
        f"Heuristic says: {'yes' if proposed else 'no'}\n"
    )

    # OpenAI
    if LLM_PROVIDER == "openai" and openai_client is not None and os.getenv("OPENAI_API_KEY"):
        try:
            resp = openai_client.chat.completions.create(
                model=LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0
            )
            text = resp.choices[0].message.content.strip().lower()
            if text.startswith("yes"):
                return True
            if text.startswith("no"):
                return False
        except Exception:
            return None

    # Google Gemini
    if LLM_PROVIDER == "google" and gemini_model is not None and os.getenv("GOOGLE_API_KEY"):
        try:
            resp = gemini_model.generate_content(prompt)
            text = (resp.text or "").strip().lower()
            if text.startswith("yes"):
                return True
            if text.startswith("no"):
                return False
        except Exception:
            return None

    # Hugging Face transformers (backup)
    if LLM_PROVIDER == "huggingface" and hf_pipeline is not None:
        try:
            # Simple keyword-based classification for HF models
            text_content = f"{p.title} {p.description or ''} {' '.join(p.keywords)}".lower()
            healthy_keywords = ["organic", "natural", "protein", "vitamin", "fiber", "low-fat", "whole grain"]
            unhealthy_keywords = ["sugar", "fried", "processed", "artificial", "high-fat", "sodium"]
            
            healthy_score = sum(1 for kw in healthy_keywords if kw in text_content)
            unhealthy_score = sum(1 for kw in unhealthy_keywords if kw in text_content)
            
            # Use nutrition data for additional scoring
            calories = p.nutrition.calories or 0
            protein = p.nutrition.proteinGrams or 0
            fat = p.nutrition.fatGrams or 0
            
            if calories > 500 or fat > 30:
                unhealthy_score += 1
            if protein > 20:
                healthy_score += 1
                
            return healthy_score > unhealthy_score
        except Exception:
            return None

    return None


@app.post("/classify/batch", response_model=BatchResponse)
async def classify_batch(body: BatchRequest):
    results: List[BatchResult] = []
    for p in body.products:
        heuristic, reason = heuristic_is_diet(p)
        override = llm_filter_if_enabled(p, heuristic)
        final = override if override is not None else heuristic
        results.append(BatchResult(id=p.id, is_diet=final, reason=reason))
    return BatchResponse(results=results)


@app.get("/health")
async def health():
    return {"ok": True} 