@echo off
TITLE Attendance Management System - Launcher
COLOR 0B

echo.
echo  ##########################################################
echo  #                                                        #
echo  #          ATTENDANCE MANAGEMENT SYSTEM                  #
echo  #          Server: 192.168.0.101  (Pi Server)           #
echo  #                                                        #
echo  ##########################################################
echo.

echo [1/3] Starting backend on Raspberry Pi (192.168.0.101)...
echo       (A terminal will open - enter password: $@me2ALL)
echo       NOTE: The app runs on PORT 8138
echo.

:: Open a separate window to SSH into 192.168.0.101 and start the backend
:: The window stays open so you can monitor the logs
start "Backend - Pi Server" cmd /k "ssh supershyboy@192.168.0.101 -t "sudo systemctl restart postgresql 2>/dev/null; pkill java 2>/dev/null; sleep 2; cd /home/supershyboy/GROUP8-SBIT3C && nohup java -jar attendease-backend-1.0.0.jar > app.log 2>&1 & sleep 5 && tail -f app.log"""

echo [2/3] Waiting 20 seconds for the backend to initialize...
timeout /t 20 /nobreak > nul

echo [3/3] Opening Dashboard at http://192.168.0.101:8138/login
start http://192.168.0.101:8138/login

echo.
echo ==========================================================
echo  SYSTEM LAUNCHED SUCCESSFULLY
echo  Dashboard: http://192.168.0.101:8138/login
echo  Backend logs are in the SSH window (app.log)
echo ==========================================================
echo.
echo Press any key to close this launcher window.
pause > nul
exit
