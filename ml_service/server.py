from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
from fastapi.middleware.cors import CORSMiddleware
import torch
import json
import time
import asyncio
from contextlib import asynccontextmanager

# Global State
model = None
tokenizer = None
model_status = "starting" # starting, ready, busy, error
model_load_time = 0
server_start_time = 0
last_request_time = 0
MODEL_NAME = "Qwen/Qwen2.5-1.5B-Instruct"

def load_model_sync():
    global model, tokenizer, model_status, model_load_time
    print(f"Loading {MODEL_NAME}...")
    try:
        start_time = time.time()
        # Load logic
        tokenizer_obj = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
        model_obj = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME, 
            trust_remote_code=True,
            device_map="auto" if torch.backends.mps.is_available() else "cpu", 
            torch_dtype=torch.float16 if torch.backends.mps.is_available() else "auto"
        )
        model_load_time = time.time() - start_time
        print(f"Model loaded successfully in {model_load_time:.2f}s.")
        
        # Update globals safely
        tokenizer = tokenizer_obj
        model = model_obj
        model_status = "ready"
    except Exception as e:
        print(f"Error loading model: {e}")
        model_status = "error"

async def load_model_bg():
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, load_model_sync)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global server_start_time
    server_start_time = time.time()
    # Trigger background loading
    asyncio.create_task(load_model_bg())
    yield
    # Cleanup logic if needed (e.g., clear GPU memory)

app = FastAPI(lifespan=lifespan)

# Allow CORS for extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CookieData(BaseModel):
    name: str
    domain: str
    path: str
    secure: bool
    httpOnly: bool
    sameSite: str
    session: bool
    expirationDate: float | None = None

@app.get("/health")
async def health_check():
    uptime = time.time() - server_start_time if server_start_time > 0 else 0
    return {
        "status": model_status,
        "model": MODEL_NAME,
        "model_loaded": model is not None,
        "uptime_sec": round(uptime, 2),
        "last_request_ms": int(last_request_time * 1000)
    }

def apply_safety_rules(analysis, cookie: CookieData):
    """Enforce strict safety rules regarding Auth and Security cookies."""
    intent = analysis.get("cookie_intent", "Unknown")
    
    # Rule 1: Auth & Security must be Essential
    if intent in ["Authentication", "Security"]:
        analysis["category"] = "Essential"
        
        # Rule 2: Max Risk 30
        if analysis["risk_score"] > 30:
            analysis["risk_score"] = 30
            
        # Rule 3: Never auto-block
        analysis["auto_block_allowed"] = False
        
        # Rule 4: Confidence boost if matched known patterns
        if "session" in cookie.name.lower() or "auth" in cookie.name.lower():
             analysis["confidence_level"] = "high"

    return analysis

# Global Lock for Inference
inference_lock = asyncio.Lock()

@app.post("/analyze")
async def analyze_cookie(cookie: CookieData):
    global model_status, last_request_time
    last_request_time = time.time()
    
    # Log incoming request
    print(f"-> Analyzing: {cookie.name} @ {cookie.domain}", flush=True)
    
    if model_status == "starting" or not model or not tokenizer:
        return {
            "category": "Unknown", 
            "cookie_intent": "Unknown",
            "risk_score": 0, 
            "explanation": f"Model is {model_status}.",
            "confidence_level": "low",
            "auto_block_allowed": True
        }
        
    previous_status = model_status
    if model_status == "ready":
        model_status = "busy"

    try:
        # Construct Prompt with Intent Hierarchy
        expiry_text = "Session" if cookie.session else "Persistent"
        
        prompt = f"""You are an advanced Browser Security Architect. Analyze this website cookie for privacy risk and security purpose.

Cookie Details:
- Name: {cookie.name}
- Domain: {cookie.domain}
- Type: {expiry_text}
- Secure: {cookie.secure}
- HttpOnly: {cookie.httpOnly}

Intent Hierarchy (Choose one):
1. Authentication (Login state, Session ID) -> CRITICAL
2. Security (CSRF, Fraud prevention, WAF) -> CRITICAL
3. Preference (Language, Theme, Settings)
4. Analytics (Usage stats, Performance)
5. Advertising (Targeting, Personalization)
6. Tracking (Cross-site profiling, Fingerprinting)
7. Unknown (Unclear purpose)

Safety Rules:
- If likely Authentication or Security, risk_score MUST be <= 30 and auto_block_allowed MUST be false.
- If Advertising/Tracking and Persistent, risk_score should be > 50.

Response Format (JSON Only):
{{
  "category": "Essential|Functional|Analytics|Advertising|Tracking|Unknown",
  "cookie_intent": "Authentication|Security|Preference|Analytics|Advertising|Tracking|Unknown",
  "risk_score": <0-100 integer>,
  "confidence_level": "high|medium|low",
  "auto_block_allowed": <true|false>,
  "explanation": "String (1 sentence, clear and user-friendly. Explain WHAT it does and WHY it is safe/risky.)"
}}
"""
        
        # Serialize inference with a Lock to prevent MPS thread double-free
        async with inference_lock:
             # Run generation in executor to avoid blocking event loop
             loop = asyncio.get_running_loop()
             result = await loop.run_in_executor(None, generate_response, prompt, cookie)
             return result

    finally:
        model_status = "ready" # Restore status

class TermsChunk(BaseModel):
    text: str

@app.post("/analyze_terms")
async def analyze_terms(chunk: TermsChunk):
    global model_status, last_request_time
    last_request_time = time.time()
    
    # Log incoming request
    print(f"-> Analyzing Terms Chunk ({len(chunk.text.split())} words)", flush=True)

    if model_status == "starting" or not model or not tokenizer:
        return {
            "identified_clauses": [],
            "risk_flags": ["Model is loading"],
            "risk_score": 0,
            "explanation": "System initializing."
        }
        
    previous_status = model_status
    if model_status == "ready":
        model_status = "busy"

    try:
        prompt = f"""You are a privacy and consumer-rights expert.

Analyze the following legal text from a website’s Terms & Conditions or Privacy Policy.

Tasks:
1. Identify clauses related to:
   - Data collection
   - Data sharing with third parties
   - Advertising or tracking
   - User consent
   - Account suspension or termination
   - Legal liability limitations
2. Flag any potentially harmful, vague, or user-unfriendly clauses.
3. Assign a risk score (0–100) for this chunk.
4. Explain the risk in simple, non-legal language.

Text to Analyze:
"{chunk.text}"

Respond in strict JSON format only:
{{
  "identified_clauses": ["List of identified topics found in text"],
  "risk_flags": ["List of specific risks found"],
  "risk_score": <int 0-100>,
  "explanation": "One sentence summary of the risk."
}}
"""
        # Serialize inference with a Lock
        async with inference_lock:
             loop = asyncio.get_running_loop()
             return await loop.run_in_executor(None, generate_response, prompt, None)
        
    finally:
        model_status = "ready"

def generate_response(prompt, cookie=None):
    try:
        messages = [
            {"role": "system", "content": "You are a helpful assistant that outputs only valid JSON."},
            {"role": "user", "content": prompt}
        ]
        
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        model_inputs = tokenizer([text], return_tensors="pt").to(model.device)

        generated_ids = model.generate(
            **model_inputs,
            max_new_tokens=400, # Increased for T&C
            temperature=0.2, 
            do_sample=True 
        )
        
        generated_ids = [
            output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]
        
        response_text = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        # Simple cleanup
        cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned_text)
        
        # Run Safety Overrides only if it's a cookie analysis
        if cookie:
            data = apply_safety_rules(data, cookie)
        
        return data
        
    except Exception as e:
        print(f"JSON Parse/Gen Error: {e}")
        # Return generic error structure compatible with both endpoints
        if cookie:
             return {
                "category": "Unknown",
                "cookie_intent": "Unknown",
                "risk_score": 50,
                "explanation": "Analysis failed to parse model output.",
                "confidence_level": "low",
                "auto_block_allowed": True
            }
        else:
            return {
                "identified_clauses": [],
                "risk_flags": ["Analysis Error"],
                "risk_score": 0,
                "explanation": "Failed to parse model output."
            }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

