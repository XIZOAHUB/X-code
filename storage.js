// Simple abstraction for local persistence + optional Firebase hooks
(function(global){
  const KEY = (global.XIZOA_CONFIG && global.XIZOA_CONFIG.APP_KEY) || 'xizoa-advanced-v1';

  function saveLocal(project){
    try{
      localStorage.setItem(KEY, JSON.stringify(project));
      return true;
    }catch(e){ console.error(e); return false; }
  }
  function loadLocal(){
    try{
      const d = localStorage.getItem(KEY);
      return d ? JSON.parse(d) : null;
    }catch(e){ console.error(e); return null; }
  }

  function exportZip(project){
    // minimal: create a downloadable JSON file (keeps lib-free)
    const zipData = JSON.stringify(project, null, 2);
    const blob = new Blob([zipData], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xizoa-project.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSONFile(file, cb){
    const r = new FileReader();
    r.onload = function(){ try{ cb(null, JSON.parse(r.result)); }catch(e){ cb(e); } };
    r.onerror = () => cb(new Error('Failed to read file'));
    r.readAsText(file);
  }

  global.XizoaStorage = { saveLocal, loadLocal, exportZip, importJSONFile };
})(window);
