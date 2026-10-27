// Launch the actual packaged executable, not a mocked BrowserWindow.
const { _electron } = require('../frontend/node_modules/playwright');
const path = require('node:path');
(async()=>{
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const app=await _electron.launch({executablePath:path.resolve(__dirname,'out/win-unpacked/NeuroMap AI.exe'),env,timeout:60000});
  try {
    const window=await app.firstWindow();
    await window.getByLabel('Workspace password').waitFor({timeout:60000});
    console.log(JSON.stringify({packagedExecutable:true,title:await window.title(),loginVisible:true,url:window.url()}));
    await window.screenshot({path:path.resolve(__dirname,'../assets/screenshots/windows-client.png')});
  } finally {await app.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
