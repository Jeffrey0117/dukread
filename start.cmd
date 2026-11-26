@echo off
rem Starts DukRead from source, in the background. A PDF path may be given: start.cmd "C:\books\x.pdf"
cd /d "%~dp0"
node scripts\live.js start %*
