@echo off
TITLE Attendance Management System - Launcher
COLOR 0B

:: ==========================================
:: ATTENDANCE MANAGEMENT SYSTEM LAUNCHER
:: ==========================================

set "PROJECT_DIR=c:\codes\Attendance-management-system"

echo.
echo  ##########################################################
echo  #                                                        #
echo  #          ATTENDANCE MANAGEMENT SYSTEM                  #
echo  #               System Boot Sequence                     #
echo  #                                                        #
echo  ##########################################################
echo.

:: Check if project directory exists
if not exist "%PROJECT_DIR%" (
    COLOR 0C
    echo [ERROR] Project directory not found at: %PROJECT_DIR%
    echo Please edit this .bat file and set the correct PROJECT_DIR path.
    pause
    exit /b
)

echo [1/3] Launching Backend Services (Spring Boot)...
start "AMS-BACKEND" /D "%PROJECT_DIR%\backend" cmd /c "echo Starting Spring Boot... && mvnw spring-boot:run"

echo [2/3] Launching Frontend Interface (Vite)...
start "AMS-FRONTEND" /D "%PROJECT_DIR%\frontend" cmd /c "echo Starting Vite Dev Server... && npm run dev"

echo.
echo [3/3] Finalizing Environment...
echo Waiting 15 seconds for services to initialize...
timeout /t 15 /nobreak > nul

echo Opening Dashboard at http://192.168.100.45:5173/...
start http://192.168.100.45:5173/

echo.
echo ==========================================================
echo  SYSTEM IS NOW RUNNING IN THE BACKGROUND
echo  - Backend: http://localhost:8080
echo  - Frontend: http://192.168.100.45:5173
echo ==========================================================
echo.
echo Press any key to exit this launcher window (Services will keep running).
pause > nul
