TERAHEADBMS v2.0
================

QUICK START
-----------
1. Install Node.js from https://nodejs.org  (LTS version)
2. Double-click  server.bat  (Windows)
   OR run  ./server.sh  (macOS/Linux)
3. Browser opens at http://localhost:3000
4. Log in and use the app!

For full setup instructions, open DEPLOYMENT_GUIDE.html in your browser.

FOLDER STRUCTURE
----------------
server.bat              Windows launcher (double-click this)
server.sh               macOS/Linux launcher
server.js               Node.js server
package.json            npm config
DEPLOYMENT_GUIDE.html   Full setup & troubleshooting guide
README.txt              This file
public/
  index.html            The app itself
  sw.js                 Service worker (PWA/offline)
  manifest.json         PWA manifest
  icon-*.png            App icons (72,96,128,192,512px)
  icon.svg              SVG master icon

DATA FILE
---------
thbms_data.json  -  Created automatically on first save.
                    ALL your business data is here.
                    Back it up regularly!

NETWORK ACCESS
--------------
Other devices on the same Wi-Fi can open:
  http://<your-PC-IP>:3000
The IP is printed when the server starts.

PWA INSTALL
-----------
After running server.bat, open http://localhost:3000 in Chrome.
Click the  Install  button in the top bar of the app.
The app installs to your Start Menu and works offline.

TROUBLESHOOTING
---------------
See DEPLOYMENT_GUIDE.html for full FAQ.

Common fixes:
- PWA diagnostics showing errors? Run server.bat first, then open localhost:3000
- Other devices can't connect? Allow Node.js through Windows Firewall
- Port in use? Edit server.js line 8: change 3000 to another port (e.g. 3001)
- Data gone? Check thbms_data.json exists. Log in to trigger auto-migration.
