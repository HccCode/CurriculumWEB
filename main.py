import json
import os
import secrets
import tempfile
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware

app = FastAPI(title="CurriculumWEB")


# --- 🛡️ MIDDLEWARE DE SEGURIDAD Y CACHÉ (SECURITY & CACHE HEADERS) ---
class SecureHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Previene Clickjacking (No permite IFrames)
        response.headers["X-Frame-Options"] = "DENY"
        # Previene MIME-Sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Habilita el filtro anti-XSS del navegador
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Fuerza el uso de HTTPS (HSTS)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # Controla la información de Referrer
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Restringe permisos innecesarios del navegador
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Caché para activos estáticos versionados y no-cache para panel/API
        path = request.url.path
        if path.startswith("/static/"):
            response.headers["Cache-Control"] = "public, max-age=604800"
        elif path.startswith(("/admin", "/api/")):
            response.headers["Cache-Control"] = "no-store"
        return response


app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(SecureHeadersMiddleware)

security = HTTPBasic()

# Rutas absolutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.json")
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# --- CREDENCIALES DE ADMINISTRADOR (configurables por variables de entorno) ---
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "secreto123")


# --- ESQUEMA DE VALIDACIÓN PARA /api/save ---
class ProfileData(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: str = ""
    role: str = ""
    bio: str = ""
    location: str = ""
    email: str = ""
    github: str = ""
    linkedin: str = ""
    resume_link: str = ""


class ExperienceItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    role: str = ""
    company: str = ""
    date: str = ""
    desc: str = ""


class ProjectItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    title: str = ""
    icon: str = "fas fa-code"
    desc: str = ""


class TechItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: str = ""
    icon: str = "fas fa-code"


class CVData(BaseModel):
    model_config = ConfigDict(extra="allow")
    profile: ProfileData = Field(default_factory=ProfileData)
    experience: list[ExperienceItem] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    tech_stack: list[TechItem] = Field(default_factory=list)


# Caché en memoria invalidada por mtime para evitar lecturas de disco redundantes
_data_cache: dict[str, Any] = {"mtime": None, "data": {}}


def get_data() -> dict[str, Any]:
    if not os.path.exists(DATA_FILE):
        return {}
    mtime = os.path.getmtime(DATA_FILE)
    if _data_cache["mtime"] != mtime:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            _data_cache["data"] = json.load(f)
        _data_cache["mtime"] = mtime
    return _data_cache["data"]


def write_data_atomic(payload: dict[str, Any]) -> None:
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=BASE_DIR,
            prefix=".data.",
            suffix=".tmp",
            delete=False,
        ) as tmp:
            tmp_path = tmp.name
            json.dump(payload, tmp, indent=4, ensure_ascii=False)
            tmp.flush()
            os.fsync(tmp.fileno())
        os.replace(tmp_path, DATA_FILE)
        _data_cache["data"] = payload
        _data_cache["mtime"] = os.path.getmtime(DATA_FILE)
    except Exception:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


def verify_credentials(credentials: Annotated[HTTPBasicCredentials, Depends(security)]) -> str:
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)

    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


AuthenticatedAdmin = Annotated[str, Depends(verify_credentials)]


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
async def read_cv(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"data": get_data()},
    )


@app.get("/admin", response_class=HTMLResponse)
async def read_admin(request: Request, username: AuthenticatedAdmin):
    return templates.TemplateResponse(
        request=request,
        name="admin.html",
        context={"data": get_data()},
    )


@app.post("/api/save")
async def save_data(payload: CVData, username: AuthenticatedAdmin):
    try:
        serialized = payload.model_dump()
        write_data_atomic(serialized)
        return {"status": "success"}
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar los datos: {e}",
        ) from e


