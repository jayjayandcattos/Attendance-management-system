@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup batch script, version 3.3.3
@REM ----------------------------------------------------------------------------

@echo off

set TITLE="Maven Wrapper"
title %TITLE%

@REM set %HOME% to equivalent of $HOME
if "%HOME%" == "" (set "HOME=%USERPROFILE%")

set WRAPPER_JAR="%~dp0.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_PROPERTIES="%~dp0.mvn\wrapper\maven-wrapper.properties"
set MAVEN_PROJECT_CONFIG_PATH="%~dp0.mvn\config"

@REM set %JAVA_HOME% to the location of your Java installation if it is not already set
if "%JAVA_HOME%" == "" (
  for %%i in (java.exe) do set "JAVA_EXE=%%~$PATH:i"
) else (
  set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
)

if not exist "%JAVA_EXE%" (
  echo Error: JAVA_HOME is set to an invalid directory. >&2
  echo JAVA_HOME = "%JAVA_HOME%" >&2
  echo Please set the JAVA_HOME variable in your environment to match the >&2
  echo location of your Java installation. >&2
  exit /b 1
)

@REM download the wrapper jar if it doesn't exist
if not exist %WRAPPER_JAR% (
    echo Downloading Maven Wrapper...
    powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.3/maven-wrapper-3.3.3.jar', '%WRAPPER_JAR:"=%') }"
)

@REM run the wrapper
"%JAVA_EXE%" %MAVEN_OPTS% %MAVEN_DEBUG_OPTS% -classpath %WRAPPER_JAR% "-Dmaven.multiModuleProjectDirectory=%~dp0." org.apache.maven.wrapper.MavenWrapperMain %*
