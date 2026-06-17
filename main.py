from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import json
import os

app = FastAPI()

# Configuramos rutas absolutas para no perdernos en carpetas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.json")
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

def get_data():
    if not os.path.exists(DATA_FILE):
        return {"error": "data.json no encontrado"}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/", response_class=HTMLResponse)
async def read_cv(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "data": get_data()})

@app.get("/admin", response_class=HTMLResponse)
async def read_admin(request: Request):
    return templates.TemplateResponse("admin.html", {"request": request, "data": get_data()})

@app.post("/api/save")
async def save_data(request: Request):
    try:
        new_data = await request.json()
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(new_data, f, indent=4, ensure_ascii=False)
        print("Archivo data.json guardado exitosamente.")
        return {"status": "success"}
    except Exception as e:
        print(f"ERROR AL GUARDAR: {e}")
        return {"status": "error", "message": str(e)}