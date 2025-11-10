@echo off
echo 🔄 Restarting HBTU College Study Mobile App...
echo.

cd /d "C:\Users\11ara\github\collegestudy\mobile-app"

echo 📱 Stopping any running Expo processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im expo.exe 2>nul

echo 🧹 Clearing Expo cache...
npx expo start --clear

echo.
echo ✅ Mobile app restarted with cleared cache!
echo 💡 If you still see issues, try:
echo    - Close and reopen the Expo Go app on your phone
echo    - Refresh the app by shaking your phone and selecting "Reload"
echo.
pause
