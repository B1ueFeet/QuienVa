@echo off

echo ==============================
echo    CLAUDE + OLLAMA LAUNCHER
echo ==============================
echo.
echo Elige un modelo:
echo 1. qwen2.5-coder:7b  (rapido)
echo 2. qwen2.5-coder:14b (mejor pero mas lento)
echo 3. qwen3.5:9b (mas lento pero con mejor rendimiento en tareas de programacion)
echo.

set /p opcion=Selecciona una opcion (1-3): 

if "%opcion%"=="1" set MODEL=qwen2.5-coder:7b
if "%opcion%"=="2" set MODEL=qwen2.5-coder:14b
if "%opcion%"=="3" set MODEL=qwen3.5:9b

if "%MODEL%"=="" (
    echo Opcion invalida
    pause
    exit
)

echo.
echo Iniciando Ollama con %MODEL%...
start cmd /k "ollama run %MODEL%"

timeout /t 5

echo.
echo Configurando entorno Claude...
set ANTHROPIC_AUTH_TOKEN=ollama
set ANTHROPIC_BASE_URL=http://localhost:11434
set ANTHROPIC_API_KEY=

echo.
echo Lanzando Claude con %MODEL%...
claude --model %MODEL%

pause