const { app, BrowserWindow, Menu } = require('electron');
const path = require('node:path');
function createWindow(){
 const win = new BrowserWindow({
  width: 1280, height: 900, minWidth: 360, minHeight: 600,
  backgroundColor: '#061522',
  autoHideMenuBar: true,
  icon: path.join(__dirname,'..','assets','icon.png'),
  webPreferences: { contextIsolation: true, nodeIntegration: false }
 });
 win.loadFile(path.join(__dirname,'..','www','index.html'));
}
app.whenReady().then(()=>{Menu.setApplicationMenu(null);createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
