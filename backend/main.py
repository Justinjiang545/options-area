from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import options, black_scholes

app = FastAPI(title="Financial Tools API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(options.router, prefix="/api/options", tags=["options"])
app.include_router(black_scholes.router, prefix="/api/black-scholes", tags=["black-scholes"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Options Area API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
