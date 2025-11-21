from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import httpx

app = FastAPI()

# Serve static files from ./public folder
app.mount("/", StaticFiles(directory="public", html=True), name="static")

@app.post("/validate")
async def validate_idea(request: Request):
    data = await request.json()
    idea = data.get("idea", "").strip()
    if not idea:
        raise HTTPException(status_code=400, detail="No idea provided")

    system_instruction = (
        "You are a SaaS product expert. Analyze the following idea carefully and give "
        "a detailed, practical validation report including strengths, weaknesses, and improvement suggestions."
    )

    payload = {
        "model": "gemma:2b",
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": idea}
        ],
        "stream": False,
    }

    url = "http://localhost:11434/api/chat"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            resp_json = response.json()
            ai_response = resp_json.get("message", {}).get("content", "No response from AI")

            # Optionally clean up or format the AI response here
            if ai_response.endswith("[End of turn]"):
                ai_response = ai_response.replace("[End of turn]", "").strip()

            return JSONResponse(content={"response": ai_response})

    except httpx.RequestError as exc:
        raise HTTPException(status_code=500, detail=f"Ollama request error: {exc}")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama API error: {exc.response.text}")
