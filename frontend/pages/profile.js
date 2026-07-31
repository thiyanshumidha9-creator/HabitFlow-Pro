/* HabitFlow Pro — Profile Page */
import { authService } from '../services/auth-service.js';
import { api } from '../services/api.js';
import { PROFILE_PICTURE_KEY } from '../services/settings-service.js';
import { toastManager } from '../components/toast.js';
import { renderIcons } from '../utils/icons.js';

const esc = value => String(value ?? '').replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const formatDate = value => value ? new Date(value).toLocaleDateString(undefined,{dateStyle:'long'}) : 'Not available';
const formatDateTime = value => value ? new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}) : 'Not available';
const initials = name => String(name || 'Member').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
let stats = null;
let pendingPicture = null;

function infoRow(icon, label, value, extraClass='') {
  return `<div class="profile-info-row"><span class="profile-info-icon" aria-hidden="true"><i data-lucide="${icon}"></i></span><span class="profile-info-label">${label}</span><strong class="profile-info-value ${extraClass}">${esc(value)}</strong></div>`;
}
function statCard(icon, label, value) {
  return `<article class="card profile-stat-card"><div class="card-body"><span class="profile-stat-icon" aria-hidden="true"><i data-lucide="${icon}"></i></span><span>${label}</span><strong>${esc(value)}</strong></div></article>`;
}
function avatarContent(user, picture) {
  return picture ? `<img src="${picture}" alt="${esc(user.full_name)} profile picture">` : `<span aria-hidden="true">${esc(initials(user.full_name))}</span><span class="sr-only">${esc(user.full_name)} initials</span>`;
}

export async function render(container) {
  const user = authService.currentUser;
  if (!user) { container.innerHTML='<div class="page-enter text-center py-12"><h2>Not Authenticated</h2><a href="#/login" class="btn btn--primary">Log In</a></div>';return; }
  if (!stats) {
    try { stats=(await api.getCached('/profile/stats',30000)).data; }
    catch { stats={total_habits:'—',completed_habits:'—',total_journal_entries:'—',achievements:[]}; }
  }
  const savedPicture=localStorage.getItem(PROFILE_PICTURE_KEY);
  const picture=pendingPicture ?? savedPicture;
  const hasPendingPicture=pendingPicture!==null;
  const earned=stats.achievements_earned ?? (stats.achievements||[]).filter(a=>a.unlocked).length;
  container.innerHTML=`<div class="page-enter sprint6-page"><header class="page-header mb-6"><h1 class="page-title">Profile</h1><p class="page-subtitle">Manage your personal details and review your HabitFlow progress.</p></header>
  <div class="profile-grid">
    <section class="card profile-account-card"><div class="card-header"><div><h2 class="card-header-title">Account Information</h2><p class="card-header-subtitle">Your profile and membership details</p></div></div><div class="card-body">
      <div class="profile-identity"><div class="profile-avatar-wrap"><div class="profile-avatar" id="profile-avatar">${avatarContent(user,picture)}</div><button class="profile-photo-button" id="avatar-button" type="button" aria-label="Edit profile photo"><i data-lucide="camera"></i><span>Edit Photo</span></button><input id="avatar-file" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden></div><div class="profile-identity-copy"><h3 class="profile-name">${esc(user.full_name)}</h3><span class="member-badge"><i data-lucide="user-round-check"></i>Member</span></div></div>
      <div class="profile-photo-actions ${picture?'':'is-hidden'}" id="photo-actions"><button class="btn btn--primary btn--sm ${hasPendingPicture?'':'is-hidden'}" id="save-avatar" type="button"><i data-lucide="save"></i>Save Photo</button><button class="btn btn--secondary btn--sm" id="remove-avatar" type="button"><i data-lucide="trash-2"></i>Remove Photo</button></div><p class="form-helper profile-photo-helper">JPG, JPEG, PNG, or WebP. Maximum 5 MB.</p>
      <div class="profile-info-list">${infoRow('mail','Email',user.email)}${user.phone?infoRow('phone','Phone',user.phone):''}${infoRow('calendar-days','Member Since',formatDate(user.created_at))}${infoRow('clock-3','Last Login',formatDateTime(user.last_login_at))}${infoRow('shield-check','Account Status',user.is_active?'Active':'Inactive',user.is_active?'text-success':'text-danger')}${infoRow('badge-check','Role',user.role?.toLowerCase()==='user'?'Member':user.role||'Member')}${infoRow('fingerprint','User ID',user.id||'Not available')}</div>
      <div class="profile-actions"><button class="btn btn--primary btn--sm" id="edit-profile-button"><i data-lucide="pencil"></i>Edit Profile</button><a class="btn btn--secondary btn--sm" href="#/settings"><i data-lucide="settings-2"></i>Manage Settings</a></div>
      <div class="profile-editor" id="profile-editor" hidden><hr><form id="profile-form" class="profile-form"><label class="form-group"><span class="form-label">Full Name</span><input class="form-input" id="profile-name" value="${esc(user.full_name)}" minlength="2" maxlength="150" autocomplete="name" required><span class="form-helper">Enter between 2 and 150 characters.</span></label><label class="form-group"><span class="form-label">Email Address</span><input class="form-input" id="profile-email" type="email" value="${esc(user.email)}" maxlength="255" autocomplete="email" required></label><div class="profile-form-actions"><button class="btn btn--primary btn--sm" type="submit"><i data-lucide="save"></i>Save Changes</button><button class="btn btn--secondary btn--sm" type="button" id="cancel-profile">Cancel</button></div></form></div>
    </div></section>
    <div class="profile-main-column"><section aria-labelledby="quick-statistics-title"><div class="section-heading mb-4"><h2 id="quick-statistics-title" class="card-header-title">Quick Statistics</h2><p class="card-header-subtitle">Your progress at a glance</p></div><div class="profile-stats">${statCard('target','Total Habits',stats.total_habits??'—')}${statCard('circle-check-big','Completed Habits',stats.completed_habits??stats.total_completions??'—')}${statCard('flame','Current Streak',stats.current_streak!=null?`${stats.current_streak} days`:'—')}${statCard('trophy','Longest Streak',stats.longest_streak!=null?`${stats.longest_streak} days`:'—')}${statCard('book-open','Journal Entries',stats.total_journal_entries??'—')}${statCard('award','Achievements Earned',earned)}${statCard('percent','Completion Rate',stats.completion_rate!=null?`${stats.completion_rate}%`:'—')}</div></section>
      <section class="card"><div class="card-header"><div><h2 class="card-header-title">Change Password</h2><p class="card-header-subtitle">Protect your account with a strong, unique password</p></div></div><div class="card-body"><form id="password-form" class="profile-form"><label class="form-group"><span class="form-label">Current Password</span><input class="form-input" id="current-password" type="password" autocomplete="current-password" required></label><label class="form-group"><span class="form-label">New Password</span><input class="form-input" id="new-password" type="password" minlength="8" maxlength="128" autocomplete="new-password" aria-describedby="password-requirements" required><span class="form-helper" id="password-requirements">At least 8 characters, including a letter and a number.</span></label><label class="form-group"><span class="form-label">Confirm Password</span><input class="form-input" id="confirm-password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label><button class="btn btn--primary btn--sm" type="submit"><i data-lucide="key-round"></i>Update Password</button></form></div></section>
      <section class="card"><div class="card-header"><div><h2 class="card-header-title">Achievements</h2><p class="card-header-subtitle">Milestones you have unlocked</p></div></div><div class="card-body"><div class="profile-achievements">${(stats.achievements||[]).filter(a=>a.unlocked).map(a=>`<span class="badge badge--success"><i data-lucide="${esc(a.icon||'award')}"></i>${esc(a.title)}</span>`).join('')||'<p class="text-body-sm">No achievements unlocked yet. Keep building your routine.</p>'}</div></div></section>
    </div></div></div>`;
  renderIcons(); bind(container);
}

function bind(container){
  const editor=container.querySelector('#profile-editor');
  container.querySelector('#edit-profile-button').onclick=()=>{editor.hidden=false;container.querySelector('#profile-name').focus();editor.scrollIntoView({behavior:'smooth',block:'nearest'});};
  container.querySelector('#cancel-profile').onclick=()=>{editor.hidden=true;container.querySelector('#edit-profile-button').focus();};
  container.querySelector('#profile-form').onsubmit=async e=>{e.preventDefault();const full_name=container.querySelector('#profile-name').value.trim(),email=container.querySelector('#profile-email').value.trim();if(full_name.length<2||full_name.length>150){toastManager.error('Full name must be between 2 and 150 characters.','Profile');return;}if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toastManager.error('Enter a valid email address.','Profile');return;}try{await authService.updateProfile({full_name,email});toastManager.success('Profile updated successfully.','Profile Updated');render(container);}catch(err){toastManager.error(err.message,'Profile Update Failed');}};
  container.querySelector('#password-form').onsubmit=async e=>{e.preventDefault();const current=container.querySelector('#current-password').value,next=container.querySelector('#new-password').value,confirm=container.querySelector('#confirm-password').value;if(!/^(?=.*[A-Za-z])(?=.*\d).{8,128}$/.test(next)){toastManager.error('Use at least 8 characters with a letter and a number.','Password');return;}if(next!==confirm){toastManager.error('New passwords do not match.','Password');return;}if(current===next){toastManager.error('Your new password must be different from the current password.','Password');return;}try{await authService.changePassword(current,next);e.target.reset();toastManager.success('Password changed successfully.','Password Updated');}catch(err){toastManager.error(err.message,'Password Change Failed');}};
  const file=container.querySelector('#avatar-file');
  container.querySelector('#avatar-button').onclick=()=>file.click();
  file.onchange=()=>{const selected=file.files[0];if(!selected)return;if(!['image/png','image/jpeg','image/webp'].includes(selected.type)||selected.size>5*1024*1024){file.value='';toastManager.error('Choose a JPG, JPEG, PNG, or WebP image up to 5 MB.','Invalid Photo');return;}const reader=new FileReader();reader.onload=()=>{pendingPicture=reader.result;container.querySelector('#profile-avatar').innerHTML=avatarContent(authService.currentUser,pendingPicture);container.querySelector('#photo-actions').classList.remove('is-hidden');container.querySelector('#save-avatar').classList.remove('is-hidden');toastManager.info('Preview ready. Select Save Photo to keep it.','Photo Preview');};reader.onerror=()=>toastManager.error('Unable to read that image.','Upload Failed');reader.readAsDataURL(selected);};
  container.querySelector('#save-avatar').onclick=()=>{if(!pendingPicture&&localStorage.getItem(PROFILE_PICTURE_KEY))return;const value=pendingPicture;if(value)localStorage.setItem(PROFILE_PICTURE_KEY,value);pendingPicture=null;window.dispatchEvent(new CustomEvent('profile:photochange',{detail:{picture:value}}));toastManager.success('Profile photo saved.','Profile Updated');render(container);};
  container.querySelector('#remove-avatar').onclick=()=>{localStorage.removeItem(PROFILE_PICTURE_KEY);pendingPicture=null;window.dispatchEvent(new CustomEvent('profile:photochange',{detail:{picture:null}}));toastManager.success('Profile photo removed. Your initials are shown instead.','Photo Removed');render(container);};
}
