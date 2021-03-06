#!/usr/bin/env bash

# Clear build and dev directory
echo '1. Remove previous build and dist folders'
rm -rf builds
rm -rf dist
rm -rf apps

# Run webpack to make sure the newest code is compiled
echo '2. Webpack compile code before packaging'
webpack --config ./webpack.production.config.js --progress --profile --colors

# Make build and dist directory
echo '3. Create new empty builds folder'
mkdir builds

# Copy over package.build.json and rename it package.json
echo '4. Copy package.build.json to build folder renamed to package.json'
cp package.build.json ./builds/package.json

# Copy over non-webpack files
echo '5. Copy non-webpack files to root of build folder'
cp -R ./shell/ ./builds/shell/

# Copy over dist folder
echo '6. Copy dist folder to root of build folder'
cp -R dist/ ./builds/dist/

# Change working directory to npm install
echo '7. Change working directory to build folder'
cd builds

# Npm install production dependencies
echo '8. npm install production dependencies'
npm install --production

# Build All packages
echo '9. Build all app packages'
npm run package-mac
npm run package-windows
npm run package-linux

# Copy tools over to builds folder
echo '10. Copy tools over to builds folder'
cp -R ../tools/ ./tools/

# Npm install builds/dev dependencies
echo '11. npm install builds/dev dependencies'
npm install

# Build Mac OS DMG
echo '12. Build DMG for Mac OSX app package'
npm run build-dmg

# Build ZIP archives for Windows and Linux
echo '13. Build ZIP archives for Windows and Linux'
npm run build-zips

# Build Windows Installer
#echo 'Build windows installer for windows package'
#npm run build-windows-installer
