from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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

# --- NUEVO: ENDPOINT PARA ENVÍO DE CORREOS ---
class ContactForm(BaseModel):
    sender_email: str
    subject: str
    message: str

@app.post("/api/contact")
async def send_contact_email(form: ContactForm):
    # Configuración de Gmail SMTP
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    
    # IMPORTANTE: Reemplaza esto con tus datos reales
    SENDER_EMAIL = "hectorum9214@gmail.com" # Desde dónde se envía (tu propio correo)
    SENDER_PASSWORD = "orncddpjfybrdwlm" # Contraseña de aplicación de Google
    
    # Obtenemos el correo destino guardado en tu panel de administrador
    data = get_data()
    my_email = data.get("profile", {}).get("email", SENDER_EMAIL)
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = my_email
        msg['Subject'] = f"Contacto CV: {form.subject}"
        
        body = f"Has recibido un nuevo mensaje desde tu Currículum Web:\n\n"
        body += f"Remitente: {form.sender_email}\n"
        body += f"Asunto: {form.subject}\n\n"
        body += f"Mensaje:\n{form.message}"
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        text = msg.as_string()
        server.sendmail(SENDER_EMAIL, my_email, text)
        server.quit()
        
        return {"status": "success"}
    except Exception as e:
        print(f"Error SMTP: {e}")
        return {"status": "error", "message": "No se pudo enviar el mensaje. Verifica las credenciales en main.py"}
