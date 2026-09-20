const sb = window.supabase.createClient(window.GROWTH_SUPABASE_URL, window.GROWTH_SUPABASE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let session=null;
let authReady=false;
function setAppAccess(isAuthenticated){
  document.body.classList.toggle('auth-authenticated',!!isAuthenticated);
  document.body.classList.toggle('auth-required',!isAuthenticated);
  const app=document.querySelector('.app');
  if(!app)return;
  app.hidden=!isAuthenticated;
  app.style.display=isAuthenticated?'grid':'none';
  let gate=document.querySelector('#authGate');
  if(!gate){
    gate=document.createElement('section');
    gate.id='authGate';
    gate.className='auth-gate';
    document.body.prepend(gate);
  }
  if(!isAuthenticated){
    gate.innerHTML='<div class="auth-card"><div class="brand"><div class="mark">CE</div><div><b>Centro de Ensino</b><span>Growth</span></div></div><h1>Acesso restrito</h1><p>Entre com seu e-mail institucional para acessar o sistema.</p><div class="auth-form"><input id="gateEmail" type="email" autocomplete="email" placeholder="E-mail"><input id="gatePass" type="password" autocomplete="current-password" placeholder="Senha"><div class="auth-actions"><button class="primary" id="gateLogin">Entrar</button><button id="gateSignup">Criar acesso</button><button type="button" id="gateReset">Esqueci minha senha</button></div><small id="gateMessage"></small></div></div>';
    document.querySelector('#gateLogin').onclick=()=>gateAuthAction('login');
    document.querySelector('#gateSignup').onclick=()=>gateAuthAction('signup');document.querySelector('#gateReset').onclick=requestPasswordReset;
  }else{
    gate.remove();
  }
  if(gate) gate.style.display=isAuthenticated?'none':'grid';
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
  gate.innerHTML=`<div class="auth-card"><div class="brand"><div class="mark">CE</div><div><b>Centro de Ensino</b><span>Growth</span></div></div><h2>${hash.includes('type=recovery')?'Redefinir senha':'Ative sua conta'}</h2><p>${hash.includes('type=recovery')?'Defina uma nova senha para recuperar o acesso.':'Defina uma senha para concluir seu primeiro acesso.'}</p><form class="auth-form" id="inviteForm"><input id="invitePassword" type="password" minlength="8" required placeholder="Nova senha"><input id="invitePassword2" type="password" minlength="8" required placeholder="Confirme a senha"><button class="primary" type="submit">${hash.includes('type=recovery')?'Salvar nova senha':'Ativar conta'}</button><p class="auth-error" id="inviteError"></p></form></div>`;
  gate.classList.add('auth-gate');
  const form=document.querySelector('#inviteForm');
  form.onsubmit=async e=>{e.preventDefault();const p=document.querySelector('#invitePassword').value,p2=document.querySelector('#invitePassword2').value,err=document.querySelector('#inviteError');if(p!==p2){err.textContent='As senhas não coincidem.';return}if(p.length<8){err.textContent='Use pelo menos 8 caracteres.';return}const {error}=await sb.auth.updateUser({password:p});if(error){err.textContent=error.message;return}history.replaceState(null,'','#/dashboard');const r=await sb.auth.getSession();session=r.data.session;setAppAccess(true);renderAuth();if(window.onGrowthAuth)window.onGrowthAuth(session)};
  return true;
}

async function initAuth(){
  const {data,error}=await sb.auth.getSession();
  if(error){alert('Falha ao recuperar a sessão: '+error.message);return;}
  session=data.session; authReady=true; setAppAccess(!!session); if(handleInviteRecovery()) return; renderAuth();
  if(window.onGrowthAuth) window.onGrowthAuth(session);
  sb.auth.onAuthStateChange((_e,s)=>{session=s;authReady=true;setAppAccess(!!s);if(handleInviteRecovery())return;renderAuth();if(window.onGrowthAuth)window.onGrowthAuth(s);});
}
function renderAuth(){const el=document.querySelector('#authbar');if(!el)return;if(session){el.innerHTML='<span class="userpill">'+escAuth(session.user.email||'usuário')+'</span><button id="profileBtn">Meu perfil</button><button id="logout">Sair</button>';document.querySelector('#profileBtn').onclick=async()=>{const u=session?.user;if(!u)return;const {data:p}=await sb.from('profiles').select('full_name,role').eq('id',u.id).maybeSingle();const gate=document.querySelector('#authGate')||document.body.appendChild(Object.assign(document.createElement('section'),{id:'authGate',className:'auth-gate'}));gate.hidden=false;gate.innerHTML=`<div class="auth-card"><div class="brand"><div class="mark">CE</div><div><b>Centro de Ensino</b><span>Growth</span></div></div><h2>Meu perfil</h2><p>${escAuth(p?.full_name||u.email||'Usuário')} · ${escAuth(p?.role||'usuário')}</p><p>E-mail: ${escAuth(u.email||'—')}</p><form class="auth-form" id="profilePassForm"><input id="profilePass1" type="password" minlength="8" required placeholder="Nova senha"><input id="profilePass2" type="password" minlength="8" required placeholder="Confirme a nova senha"><button class="primary">Alterar senha</button><button type="button" id="closeProfile">Voltar</button><small id="profileMsg"></small></form></div>`;document.querySelector('#closeProfile').onclick=()=>{gate.remove()};document.querySelector('#profilePassForm').onsubmit=async e=>{e.preventDefault();const a=document.querySelector('#profilePass1').value,b=document.querySelector('#profilePass2').value,m=document.querySelector('#profileMsg');if(a!==b){m.textContent='As senhas não coincidem.';return}if(a.length<8){m.textContent='Use pelo menos 8 caracteres.';return}const r=await sb.auth.updateUser({password:a});m.textContent=r.error?r.error.message:'Senha alterada com sucesso.'}};document.querySelector('#logout').onclick=()=>sb.auth.signOut({scope:'local'});}else{el.innerHTML='<input id="authEmail" type="email" placeholder="E-mail"><input id="authPass" type="password" placeholder="Senha"><button class="primary" id="login">Entrar</button><button id="signup">Criar acesso</button><small class="userpill">Primeiro acesso: use seu e-mail institucional.</small>';document.querySelector('#login').onclick=()=>authAction('login');document.querySelector('#signup').onclick=()=>authAction('signup');}}
async function requestPasswordReset(){const email=document.querySelector('#gateEmail')?.value.trim();const message=document.querySelector('#gateMessage');if(!email){if(message)message.textContent='Informe seu e-mail para receber o link de recuperação.';return}if(message)message.textContent='Enviando link…';const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/#/reset-password'});if(message)message.textContent=error?error.message:'Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.'}
async function authAction(action){const email=document.querySelector('#authEmail').value.trim(),password=document.querySelector('#authPass').value;if(!email||!password)return alert('Informe e-mail e senha.');const r=action==='login'?await sb.auth.signInWithPassword({email,password}):await sb.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});if(r.error)alert(r.error.message);else alert(action==='signup'?'Acesso criado. Se a confirmação de e-mail estiver ativa, confirme o endereço e entre novamente.':'Login realizado.');}
function escAuth(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
window.growthAuth={sb,getSession:()=>session};initAuth();