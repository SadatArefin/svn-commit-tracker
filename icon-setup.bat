@echo off
echo SVN Commit Tracker - Icon Converter

echo This script will help you apply the SVN icon across your application.
echo.

if exist "assets\svn.png" (
    echo Found SVN icon: assets\svn.png
) else (
    echo ERROR: SVN icon not found at assets\svn.png
    echo Please place your SVN icon in the assets folder and try again.
    goto :end
)

echo.
echo The SVN icon has been configured in the following locations:
echo - Application window (main.js)
echo - HTML favicon (index.html)
echo - Application title (index.html)
echo - Package build configurations (package.json)
echo - README documentation

echo.
echo For building distributables, you need icon files in specific formats:
echo.
echo Choose an option:
echo 1. Prepare for Windows build (create .ico)
echo 2. Prepare for macOS build (create .icns)
echo 3. Prepare for all platforms
echo 4. Exit

choice /c 1234 /n /m "Your choice: "

if errorlevel 4 goto :end
if errorlevel 3 goto :all
if errorlevel 2 goto :mac
if errorlevel 1 goto :windows

:windows
echo.
echo To create a Windows icon (.ico), you have a few options:
echo - Use an online converter like https://convertico.com/
echo - Use ImageMagick: magick convert assets/svn.png -resize 256x256 assets/icon.ico
echo - Use a tool like IcoFX
echo.
echo After creating the icon, run: npm run build-win
goto :end

:mac
echo.
echo To create a macOS icon (.icns), you have a few options:
echo - Use an online converter like https://convertio.co/png-icns/
echo - On macOS, use the iconutil command (see create-icns.sh for details)
echo.
echo After creating the icon, run: npm run build-mac
goto :end

:all
echo.
echo You'll need to create both .ico (Windows) and .icns (macOS) files.
echo See the options for each platform above.
echo.
echo After creating both icons, run: npm run dist
goto :end

:end
echo.
pause
