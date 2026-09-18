const SITE = 'https://vote.chenterce.info';
const REPO = 'meiuej/savevote';
const COOKIE = '__Host-savevote-oauth';
const cookie = (value, age = 600) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
const encode = data => JSON.stringify(data).replace(/</g, '\\u003c');
function response(body, status = 200, extra = {}) {
  return new Response(body, {status, headers: {'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', ...extra}});
}
function result(payload) {
  const nonce = random();
  const message = `authorization:github:${payload.token ? 'success' : 'error'}:${JSON.stringify(payload)}`;
  const body = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>Вход в редактор</title><p>Завершение входа. Это окно можно закрыть после перехода в редактор.</p><script nonce="${nonce}">
const target = ${encode(SITE)};
if (window.opener) {
  const receive = event => {
    if (event.origin !== target || event.source !== window.opener || event.data !== 'authorizing:github') return;
    window.removeEventListener('message', receive);
    window.opener.postMessage(${encode(message)}, target);
    window.close();
  };
  window.addEventListener('message', receive);
  window.opener.postMessage('authorizing:github', target);
}
</script></html>`;
  return response(body, 200, {'Content-Type':'text/html; charset=utf-8', 'Set-Cookie':cookie('',0), 'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`});
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return response('Method not allowed',405);
    if (url.pathname === '/health') return response(JSON.stringify({ready:Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)}),200,{'Content-Type':'application/json'});
    if (!['/auth','/callback'].includes(url.pathname)) return response('Not found',404);
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return response('OAuth is not configured',503);
    if (url.pathname === '/auth') {
      if (url.searchParams.get('provider') !== 'github' || url.searchParams.get('site_id') !== new URL(SITE).hostname) return response('Invalid authentication request',400);
      const state = random();
      const authorize = new URL('https://github.com/login/oauth/authorize');
      authorize.search = new URLSearchParams({client_id:env.GITHUB_CLIENT_ID, redirect_uri:url.origin+'/callback', scope:'public_repo', state}).toString();
      return response('',302,{'Location':authorize.href,'Set-Cookie':cookie(state)});
    }
    const state = url.searchParams.get('state');
    const savedState = (request.headers.get('Cookie') || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
    if (!state || !savedState || !/^[a-f0-9]{64}$/.test(state) || state !== savedState) return response('Invalid or expired login. Close this window and sign in again.',400,{'Set-Cookie':cookie('',0)});
    if (url.searchParams.has('error') || !url.searchParams.get('code')) return result({error:'Вход отменён. Попробуйте снова.'});
    try {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:url.origin+'/callback'})});
      const token = await tokenResponse.json();
      if (!tokenResponse.ok || !token.access_token) return result({error:'Не удалось завершить вход через GitHub.'});
      const repoResponse = await fetch(`https://api.github.com/repos/${REPO}`,{headers:{'Authorization':`Bearer ${token.access_token}`,'Accept':'application/vnd.github+json','User-Agent':'savevote-cms-auth','X-GitHub-Api-Version':'2022-11-28'}});
      if (!repoResponse.ok || !(await repoResponse.json()).permissions?.push) return result({error:'Нужен доступ на запись к репозиторию сайта.'});
      return result({token:token.access_token,provider:'github'});
    } catch {
      return result({error:'Сервис входа временно недоступен. Попробуйте позже.'});
    }
  }
};
