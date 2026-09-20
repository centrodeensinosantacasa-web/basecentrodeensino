const sb = window.supabase.createClient(window.GROWTH_SUPABASE_URL, window.GROWTH_SUPABASE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let session=null;
let authReady=false;
function setAppAccess(isAuthenticated){
  const app=document.querySelector('.app');
  if(!app)return;
  app.hidden=!isAuthenticated;
  document.body.classList.toggle('auth-required',!isAuthenticated);
  let gate=document.querySelector('#authGate');
  if(!gate){
    gate=document.createElement('section');
    gate.id='authGate';
    gate.className='auth-gate';
    document.body.prepend(gate);
  }
  if(!isAuthenticated){
    gate.innerHTML='<div class="auth-card"><div class="brand"><div class="mark">CE</div><div><b>Centro de Ensino</b><span>Growth</span></div></div><h1>Acesso restrito</h1><p>Entre com seu e-mail institucional para acessar o sistema.</p><div class="auth-form"><input id="gateEmail" type="email" autocomplete="email" placeholder="E-mail"><input id="gatePass" type="password" autocomplete="current-password" placeholder="Senha"><div class="auth-actions"><button class="primary" id="gateLogin">Entrar</button><button id="gateSignup">Criar acesso</button></div><small id="gateMessage"></small></div></div>';
    document.querySelector('#gateLogin').onclick=()=>gateAuthAction('login');
    document.querySelector('#gateSignup').onclick=()=>gateAuthAction('signup');
  }else{
    gate.remove();
  }
}
async function gateAuthAction(action){
  const email=document.querySelector('#gateEmail')?.value.trim();
  const password=document.querySelector('#gatePass')?.value;
  const message=document.querySelector('#gateMessage');
  if(!email||!password){if(message)message.textContent='Informe e-mail e senha.';return}
  if(message)message.textContent='Processando…';
  const r=action==='login'
    ? await sb.auth.signInWithPassword({email,password})
    : await sb.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});
  if(r.error){if(message)message.textContent=r.error.message;return}
  if(message)message.textContent=action==='signup'?'Acesso criado. Se a confirmação de e-mail estiver ativa, confirme seu endereço.':'Login realizado.';
}

function handleInviteRecovery(){
  const hash=location.hash||'';
  const isRecovery=hash.includes('type=invite')||hash.includes('type=recovery')||hash.includes('access_token=');
  if(!isRecovery)return false;
  const gate=document.querySelector('#authGate');
  if(!gate)return false;
  gate.hidden=false;
  gate.innerHTML=`<div class="auth-card"><div class="brand"><div class="mark">CE</div><div><b>Centro de Ensino</b><span>Growth</span></div></div><h2>Ative sua conta</h2><p>Defina uma senha para concluir seu primeiro acesso.</p><form class="auth-form" id="inviteForm"><input id="invitePassword" type="password" minlength="8" required placeholder="Nova senha"><input id="invitePassword2" type="password" minlength="8" required placeholder="Confirme a senha"><button class="primary" type="submit">Ativar conta</button><p class="auth-error" id="inviteError"></p></form></div>`;
  gate.classList.add('auth-gate');
  const form=document.querySelector('#inviteForm');
  form.onsubmit=async e=>{e.preventDefault();const p=document.querySelector('#invitePassword').value,p2=document.querySelector('#invitePassword2').value,err=document.querySelector('#inviteError');if(p!==p2){err.textContent='As senhas não coincidem.';return}if(p.length<8){err.textContent='Use pelo menos 8 caracteres.';return}const {error}=await sb.auth.updateUser({password:p});if(error){err.textContent=error.message;return}history.replaceState(null,'','#/dashboard');setAppAccess(true);if(window.onGrowthAuth)window.onGrowthAuth(session)};
  return true;
}
\nasync function initAuth(){
  const {data,error}=await sb.auth.getSession();
  if(error){alert('Falha ao recuperar a sessão: '+error.message);return;}
  session=data.session; authReady=true; setAppAccess(!!session); renderAuth();
  if(window.onGrowthAuth) window.onGrowthAuth(session);
  sb.auth.onAuthStateChange((_e,s)=>{session=s;authReady=true;setAppAccess(!!s);renderAuth();if(window.onGrowthAuth)window.onGrowthAuth(s);});
}
function renderAuth(){const el=document.querySelector('#authbar');if(!el)return;if(session){el.innerHTML='<span class="userpill">'+escAuth(session.user.email||'usuário')+'</span><button id="logout">Sair</button>';document.querySelector('#logout').onclick=()=>sb.auth.signOut();}else{el.innerHTML='<input id="authEmail" type="email" placeholder="E-mail"><input id="authPass" type="password" placeholder="Senha"><button class="primary" id="login">Entrar</button><button id="signup">Criar acesso</button><small class="userpill">Primeiro acesso: use seu e-mail institucional.</small>';document.querySelector('#login').onclick=()=>authAction('login');document.querySelector('#signup').onclick=()=>authAction('signup');}}
async function authAction(action){const email=document.querySelector('#authEmail').value.trim(),password=document.querySelector('#authPass').value;if(!email||!password)return alert('Informe e-mail e senha.');const r=action==='login'?await sb.auth.signInWithPassword({email,password}):await sb.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});if(r.error)alert(r.error.message);else alert(action==='signup'?'Acesso criado. Se a confirmação de e-mail estiver ativa, confirme o endereço e entre novamente.':'Login realizado.');}
function escAuth(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
window.growthAuth={sb,getSession:()=>session};initAuth();