const {app,BrowserWindow,dialog}=require('electron');
const raw=process.env.NEUROMAP_DESKTOP_URL||'http://127.0.0.1:4173';
function checkedUrl(value){const url=new URL(value);if(url.username||url.password||!(url.protocol==='https:'||(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))))throw Error('Use an HTTPS server or a loopback development URL.');return url;}
app.whenReady().then(()=>{
  let target;try{target=checkedUrl(raw);}catch(e){dialog.showErrorBox('Invalid NeuroMap AI server',e.message);app.quit();return;}
  const win=new BrowserWindow({width:1440,height:960,minWidth:390,minHeight:640,title:'NeuroMap AI',backgroundColor:'#0b1020',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==target.origin)event.preventDefault();});
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  win.webContents.on('did-fail-load',(_event,code)=>{if(code===-3)return;dialog.showErrorBox('NeuroMap AI server unavailable','Start the configured frontend and API, then reopen the client. Default: http://127.0.0.1:4173. Set NEUROMAP_DESKTOP_URL to your trusted HTTPS deployment. This client requires a working server; no ML runtime is bundled.');});
  win.loadURL(target.href).catch(()=>{});
});
app.on('window-all-closed',()=>app.quit());
