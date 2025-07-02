@echo off
echo Converting SVN.png to icon.ico for Windows...

REM This is a guide for manually converting the PNG to ICO format
echo To properly convert the PNG to ICO format, you have a few options:

echo Option 1: Use an online converter:
echo - Visit https://convertico.com/ or similar website
echo - Upload assets/svn.png
echo - Download the converted icon.ico file
echo - Place it in the assets folder

echo Option 2: Use ImageMagick (if installed):
echo - Run: magick convert assets/svn.png -resize 256x256 assets/icon.ico

echo Option 3: Install an icon creator tool like IcoFX

echo After creating the icon.ico file, you can build your application:
echo npm run build-win

pause
