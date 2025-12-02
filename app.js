// Main app logic: explorer, monaco, run, import/export
(async function(){
  const cfg = window.XIZOA_CONFIG || {};
  const PASS = cfg.PASSWORD || "ADMIN";
  const APP_KEY = cfg.APP_KEY || "xizoa-advanced-v1";

  // DOM
  const lockScreen = document.getElementById('lock-screen');
  const passInput = document.getElementById('pass');
  const unlockBtn = document.getElementById('unlockBtn');
  const demoBtn = document.getElementById('demoBtn');
  const lockMsg = document.getElementById('lockMsg');

  const appRoot = document.getElementById('app');
  const newFileBtn = document.getElementById('newFileBtn');
  const fileListEl = document.getElementById('fileList');
  const tabsEl = document.getElementById('tabs');
  const editorEl = document.getElementById('editor');
  const saveBtn = document.getElementById('saveBtn');
  const runBtn = document.getElementById('runBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const fileImport = document.getElementById('fileImport');
  const previewArea = document.getElementById('previewArea');
  const previewFrame = document.getElementById('previewFrame');
  const closePreview = document.getElementById('closePreview');
  const status = document.getElementById('status');

  // State
  let PROJECT = {}; // { filename: {lang, content} }
  let ACTIVE = null;
  let editor = null;
  let models = {};

  // Helpers
  function setStatus(t){ if(status) status.innerText = t; }

  // AUTH
  unlockBtn.onclick = () => {
    if(passInput.value === PASS){ openApp(); }
    else { lockMsg.innerText = 'ACCESS DENIED'; lockMsg.style.opacity = 1; }
  };
  demoBtn.onclick = () => {
    loadDemoProject();
    openApp();
  };
  passInput.addEventListener('keypress', (e)=>{ if(e.key==='Enter') unlockBtn.click(); });

  // Load demo project
  function loadDemoProject(){
    PROJECT = {
      'index.html': { lang:'html', content: `<!doctype html><html><head><meta charset="utf-8"><title>Demo</title></head><body><h1>Hello XIZOAHUB</h1></body></html>` },
      'style.css': { lang:'css', content: 'body{background:#111;color:#0ff;font-family:system-ui}' },
      'script.js': { lang:'javascript', content: 'console.log("Xizoa demo");' }
    };
    ACTIVE = 'index.html';
  }

  // Open app
  function openApp(){
    lockScreen.classList.add('hidden');
    appRoot.classList.remove('hidden');
    // load saved if any
    const saved = XizoaStorage.loadLocal();
    if(saved && Object.keys(saved).length) { PROJECT = saved; ACTIVE = Object.keys(PROJECT)[0]; }
    if(!ACTIVE) ACTIVE = Object.keys(PROJECT)[0] || 'index.html';
    initMonaco();
    renderExplorer();
    renderTabs();
    setStatus('Editor ready');
  }

  // Explorer UI
  function renderExplorer(){
    fileListEl.innerHTML = '';
    Object.keys(PROJECT).forEach(fn => {
      const el = document.createElement('div');
      el.className = 'file' + (fn===ACTIVE ? ' active' : '');
      el.innerHTML = `<span>${fn}</span><span style="display:flex;gap:8px">
        <button title="Open" data-open="${fn}">Open</button>
        <button title="Delete" data-del="${fn}">Del</button>
      </span>`;
      fileListEl.appendChild(el);
    });
    // attach handlers
    fileListEl.querySelectorAll('button[data-open]').forEach(b => b.onclick = (e)=> { switchFile(e.target.getAttribute('data-open')); });
    fileListEl.querySelectorAll('button[data-del]').forEach(b => b.onclick = (e)=> { deleteFile(e.target.getAttribute('data-del')); });
  }

  function renderTabs(){
    tabsEl.innerHTML = '';
    Object.keys(PROJECT).forEach(fn => {
      const t = document.createElement('div');
      t.className = 'tab' + (fn===ACTIVE ? ' active':'' );
      t.innerText = fn;
      t.onclick = ()=> switchFile(fn);
      tabsEl.appendChild(t);
    });
  }

  function switchFile(fn){
    if(!PROJECT[fn]) return;
    ACTIVE = fn;
    renderExplorer(); renderTabs();
    const item = PROJECT[fn];
    const modelKey = fn;
    if(!models[modelKey]){
      models[modelKey] = monaco.editor.createModel(item.content || '', item.lang || 'plaintext');
    }
    editor.setModel(models[modelKey]);
  }

  function deleteFile(fn){
    if(!confirm('Delete '+fn+' ?')) return;
    if(models[fn]){ try{ models[fn].dispose(); }catch(e){} delete models[fn]; }
    delete PROJECT[fn];
    if(ACTIVE === fn) ACTIVE = Object.keys(PROJECT)[0] || null;
    renderExplorer(); renderTabs();
    if(ACTIVE) switchFile(ACTIVE);
  }

  newFileBtn.onclick = ()=> {
    const name = prompt('New file name (e.g. test.js)');
    if(!name) return;
    if(PROJECT[name]) { alert('File exists'); return; }
    let lang = 'plaintext';
    if(name.endsWith('.html')) lang='html';
    else if(name.endsWith('.css')) lang='css';
    else if(name.endsWith('.js')) lang='javascript';
    PROJECT[name] = { lang, content: '' };
    renderExplorer(); renderTabs(); switchFile(name);
  };

  // Monaco editor boot
  function initMonaco(){
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
    require(['vs/editor/editor.main'], function(){
      editor = monaco.editor.create(editorEl, {
        value: '',
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13
      });
      // create models for existing files
      Object.keys(PROJECT).forEach(fn => {
        models[fn] = monaco.editor.createModel(PROJECT[fn].content || '', PROJECT[fn].lang || 'plaintext');
      });
      // set model
      if(ACTIVE && models[ACTIVE]) editor.setModel(models[ACTIVE]);
      // listen for changes to sync to PROJECT
      editor.onDidChangeModelContent(()=> {
        if(!ACTIVE) return;
        const m = editor.getModel();
        if(!m) return;
        PROJECT[ACTIVE].content = m.getValue();
      });
    });
  }

  // Save / Export / Import
  saveBtn.onclick = ()=> {
    // ensure latest model sync
    if(editor && editor.getModel()) PROJECT[ACTIVE] = { lang: PROJECT[ACTIVE].lang, content: editor.getValue() };
    XizoaStorage.saveLocal(PROJECT);
    setStatus('Saved locally');
  };

  exportBtn.onclick = ()=> {
    XizoaStorage.exportZip(PROJECT);
    setStatus('Export initiated');
  };

  importBtn.onclick = ()=> { fileImport.click(); };
  fileImport.onchange = (e) => {
    const f = e.target.files[0];
    if(!f) return;
    XizoaStorage.importJSONFile(f, (err, data) => {
      if(err){ alert('Import failed'); return; }
      PROJECT = data;
      // normalize strings to {lang,content}
      Object.keys(PROJECT).forEach(k=>{
        if(typeof PROJECT[k] === 'string') PROJECT[k] = { lang: k.endsWith('.css')?'css':k.endsWith('.js')?'javascript':'html', content: PROJECT[k] };
      });
      ACTIVE = Object.keys(PROJECT)[0];
      // rebuild models
      Object.keys(models).forEach(m=>{ try{ models[m].dispose(); }catch(e){} delete models[m]; });
      renderExplorer(); renderTabs();
      if(editor) switchFile(ACTIVE);
      setStatus('Imported project');
    });
  };

  // Run
  runBtn.onclick = ()=>{
    if(editor && editor.getModel()) PROJECT[ACTIVE].content = editor.getModel().getValue();
    const html = PROJECT['index.html'] ? (PROJECT['index.html'].content || '') : '<h1>No index.html</h1>';
    let final = html;
    if(PROJECT['style.css']) final = final.replace('</head>', `<style>${PROJECT['style.css'].content}</style></head>`);
    if(PROJECT['script.js']) final = final.replace('</body>', `<script>${PROJECT['script.js'].content}<\/script></body>`);
    previewFrame.srcdoc = final;
    previewArea.classList.remove('hidden');
  };
  closePreview.onclick = ()=> { previewArea.classList.add('hidden'); previewFrame.srcdoc=''; };

  // On load, try to pre-load saved project
  (function tryLoad(){
    const saved = XizoaStorage.loadLocal();
    if(saved && Object.keys(saved).length) { PROJECT = saved; }
    else { // create starter scaffold
      PROJECT = {
        'index.html': { lang:'html', content:'<!doctype html><html><head><meta charset="utf-8"><title>Xizoa</title></head><body><h1>XIZOAHUB</h1></body></html>' },
        'style.css': { lang:'css', content:'body{background:#111;color:#0ff;font-family:system-ui;padding:30px}' },
        'script.js': { lang:'javascript', content:'console.log("welcome");' }
      }
    }
  })();

  // Service worker registration (PWA)
  if('serviceWorker' in navigator){
    try{ navigator.serviceWorker.register('/sw.js'); }catch(e){ console.warn('SW failed', e); }
  }

})();
