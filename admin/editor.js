// Set this to the deployed OAuth service URL after configuring GitHub login.
const authBaseUrl = 'https://savevote-cms-auth.lobodatim.workers.dev';
async function startEditor(demo) {
  if (!window.CMS) {
    document.getElementById('error').textContent = 'Не удалось загрузить редактор. Проверьте подключение и обновите страницу.';
    return;
  }
  let config;
  try {
    const response = await fetch('config.json');
    if (!response.ok) throw new Error('Configuration unavailable');
    config = await response.json();
  } catch {
    document.getElementById('error').textContent = 'Не удалось загрузить настройки редактора. Обновите страницу.';
    return;
  }
  document.getElementById('setup').hidden = true;
  if (demo) {
    const badge = document.createElement('div');
    badge.textContent = 'Деморежим: записи исчезнут после перезагрузки и не попадут на сайт';
    badge.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:8px 12px;background:#fff0cc;color:#604900;text-align:center;font:14px/1.4 Arial,sans-serif;pointer-events:none';
    document.body.append(badge);
  }
  CMS.init({config: {
    ...config, load_config_file: false,
    backend: demo ? {name: 'test-repo'} : {
      name: 'github', repo: 'meiuej/savevote', branch: 'main',
      base_url: authBaseUrl, auth_endpoint: 'auth'
    },
    ...(demo ? {publish_mode: 'simple'} : {})
  }});
}
document.getElementById('demo').addEventListener('click', () => startEditor(true));
if (authBaseUrl) startEditor(false);
