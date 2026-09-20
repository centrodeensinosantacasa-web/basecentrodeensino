const sb = window.supabase.createClient(window.GROWTH_SUPABASE_URL, window.GROWTH_SUPABASE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let session=null;
async function initAuth(){
  const {data}=await sb.auth.getSession(); session=data.session; renderAuth();
  sb.auth.onAuthStateChange((_e,s)=>{session=s;renderAuth(); if(window.onGrowthAuth) window.onGrowthAuth(s);});
}
function renderAuth(){
  const el=document.querySelector('#authbar'); if(!el)return;
  if(session){el.innerHTML=`<span class="userpill">${escAuth(session.user.email||'usuário')}</span><button id="logout">Sair</button>`;document.querySelector('#logout').onclick=()=>sb.auth.signOut();}
  else {el.innerHTML='<input id="authEmail" type="email" placeholder="E-mail"><input id="authPass" type="password" placeholder="Senha"><button class="primary" id="login">Entrar</button><button id="signup">Criar acesso</button><small class="userpill">Primeiro acesso: use seu e-mail institucional.</small>';document.querySelector('#login').onclick=()=>authAction('login');document.querySelector('#signup').onclick=()=>authAction('signup');}
}
async function authAction(action){const email=document.querySelector('#authEmail').value.trim(),password=document.querySelector('#authPass').value;if(!email||!password)return alert('Informe e-mail e senha.');const r=action==='login'?await sb.auth.signInWithPassword({email,password}):await sb.auth.signUp({email,password});if(r.error)alert(r.error.message);else alert(action==='signup'?'Acesso criado. Se a confirmação de e-mail estiver ativa, confirme o endereço e entre novamente.':'Login realizado.');}
function escAuth(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
window.growthAuth={sb,getSession:()=>session};
initAuth();
