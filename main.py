from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import json
import os
import secrets

app = FastAPI()
security = HTTPBasic()

# Rutas absolutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.json")
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# --- CREDENCIALES DE ADMINISTRADOR ---
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "secreto123"

def get_data():
    if not os.path.exists(DATA_FILE):
        return {}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

# Función para verificar usuario y contraseña
def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@app.get("/", response_class=HTMLResponse)
async def read_cv(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="index.html", 
        context={"data": get_data()}
    )

# Ruta protegida con Dependencia (pedirá usuario y contraseña)
@app.get("/admin", response_class=HTMLResponse)
async def read_admin(request: Request, username: str = Depends(verify_credentials)):
    return templates.TemplateResponse(
        request=request, 
        name="admin.html", 
        context={"data": get_data()}
    )

@app.post("/api/save")
async def save_data(request: Request):
    try:
        new_data = await request.json()
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(new_data, f, indent=4, ensure_ascii=False)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}