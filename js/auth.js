/**
 * auth.js - Cryptographically Grounded RBAC Authentication System
 * SR Brokerage Ledger \u2022 Transport Brokerage Ledger Pvt Ltd
 * Fleet Logistics & Financial Accounts Management
 * Developed by Shravan Kumar
 * 
 * Credentials are verified by the Apps Script backend; browser account data is presentation-only.
 * 
 * Permissions:
 *  - ADMIN: Add, edit, update POD, delete records, and access settings
 *  - RUDRA (Employee): Fleet Operations (Add, Edit, Update POD \u2014 Delete is Restricted)
 * 
 * Auto-Logout:
 *  - 10-minute idle timeout; server sessions expire after one hour.
 */

const AuthModule = {
  storageKey: 'broker_auth_user_v5',
  selectedUser: 'Admin',
  idleTimeoutMs: 10 * 60 * 1000, // 10 minutes
  _idleTimer: null,
  _isSigningIn: false,
  _sessionToken: null,
  _currentUser: null,

  // These account details only drive presentation; the backend session is authoritative.
  accounts: {
    admin: {
      username: 'admin',
      displayName: 'Shravan (Admin)',
      role: 'admin',
      badgeColor: '#1e3a8a',
      permissions: { canAdd: true, canEdit: true, canDelete: true }
    },
    rudra: {
      username: 'rudra',
      displayName: 'Rudra (Employee)',
      role: 'employee',
      badgeColor: '#059669',
      permissions: { canAdd: true, canEdit: true, canDelete: false }
    }
  },

  init() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem('broker_pwd_override_admin');
      localStorage.removeItem('broker_pwd_override_rudra');
    } catch (error) {
      console.error('Could not clear legacy browser credentials:', error);
    }
    this.checkAuthState();
    this.initActivityTracking();
  },

  // 10-Minute Inactivity Auto-Logout Tracker
  initActivityTracking() {
    const handleActivity = () => {
      if (this.getCurrentUser()) {
        this.resetInactivityTimer();
      }
    };

    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evt => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    if (this.getCurrentUser()) {
      this.resetInactivityTimer();
    }
  },

  resetInactivityTimer() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      if (this.getCurrentUser()) {
        this.logout();
        alert('Session expired due to 10 minutes of inactivity. Please sign in again.');
      }
    }, this.idleTimeoutMs);
  },

  clearInactivityTimer() {
    if (this._idleTimer) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  },

  checkAuthState() {
    const user = this.getCurrentUser();
    const authWrapper = document.getElementById('authWrapper');
    const appWrapper = document.getElementById('appWrapper');

    if (user && user.role) {
      if (authWrapper) authWrapper.style.display = 'none';
      if (appWrapper) appWrapper.style.display = 'flex';
      this.updateHeaderUI();
      this.resetInactivityTimer();
    } else {
      if (authWrapper) authWrapper.style.display = 'flex';
      if (appWrapper) appWrapper.style.display = 'none';
      this.clearInactivityTimer();
      this.selectLoginUser('Admin');
    }
  },

  getCurrentUser() {
    return this._currentUser;
  },

  getSessionToken() {
    return this._sessionToken;
  },

  handleSessionExpired() {
    if (!this._currentUser) return;
    this.logout();
    alert('Your secure session expired. Please sign in again.');
  },

  selectLoginUser(userType) {
    this.selectedUser = userType;
    const hiddenInput = document.getElementById('loginSelectedUser');
    if (hiddenInput) hiddenInput.value = userType;

    const btnAdmin = document.getElementById('userBtnAdmin');
    const btnRudra = document.getElementById('userBtnRudra');
    const pwdInput = document.getElementById('loginPassword');
    const errBox = document.getElementById('loginErrorMsg');

    if (btnAdmin) btnAdmin.classList.toggle('active', userType === 'Admin');
    if (btnRudra) btnRudra.classList.toggle('active', userType === 'Rudra');

    if (pwdInput) {
      pwdInput.placeholder = `Enter password for ${userType}`;
      pwdInput.value = '';
      pwdInput.focus();
    }

    if (errBox) {
      errBox.style.display = 'none';
      errBox.innerText = '';
    }
  },

  togglePasswordVisibility() {
    const pwdInput = document.getElementById('loginPassword');
    const toggleBtn = document.getElementById('togglePasswordBtn');
    if (!pwdInput) return;

    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      if (toggleBtn) toggleBtn.innerText = '\uD83D\uDE48';
    } else {
      pwdInput.type = 'password';
      if (toggleBtn) toggleBtn.innerText = '\uD83D\uDC41\uFE0F';
    }
  },

  async handleLogin(event) {
    if (event) event.preventDefault();
    if (this._isSigningIn) return;

    const selectedType = this.selectedUser || 'Admin';
    const pwdInput = document.getElementById('loginPassword');
    const errBox = document.getElementById('loginErrorMsg');
    const pwd = pwdInput ? pwdInput.value : '';

    if (!pwd.trim()) {
      if (errBox) {
        errBox.style.display = 'block';
        errBox.innerText = 'Please enter your password.';
      }
      return;
    }

    const accountKey = selectedType.toLowerCase() === 'admin' ? 'admin' : 'rudra';
    const account = this.accounts[accountKey];
    if (!account || typeof ApiService === 'undefined') {
      if (errBox) {
        errBox.style.display = 'block';
        errBox.innerText = 'Secure sign-in is unavailable. Check the cloud configuration and try again.';
      }
      return;
    }

    this._isSigningIn = true;
    const submitButton = document.getElementById('loginSubmitBtn');
    const originalButtonText = submitButton ? submitButton.innerText : '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerText = 'Signing in...';
    }

    const result = await ApiService.login(account.username, pwd).catch(error => {
      console.error('Sign-in request failed:', error);
      return { status: 'error', message: 'Cloud sign-in is unavailable. Please retry.' };
    });
    try {
      if (result && result.status === 'success' && result.sessionToken &&
          result.role === (accountKey === 'admin' ? 'admin' : 'employee')) {
        this._sessionToken = result.sessionToken;
        this._currentUser = {
          username: account.username,
          displayName: result.displayName || account.displayName,
          role: result.role,
          badgeColor: account.badgeColor,
          permissions: account.permissions,
          loginTime: Date.now()
        };

        const authWrapper = document.getElementById('authWrapper');
        const appWrapper = document.getElementById('appWrapper');

        if (authWrapper) authWrapper.style.display = 'none';
        if (appWrapper) appWrapper.style.display = 'flex';

        this.updateHeaderUI();
        this.resetInactivityTimer();

        if (typeof AppModule !== 'undefined') {
          AppModule.switchView('dashboard');
          AppModule.showToast(`\uD83D\uDE80 Welcome back, ${account.displayName}!`);
        }

        if (pwdInput) pwdInput.value = '';
        if (errBox) errBox.style.display = 'none';

        if (typeof ApiService !== 'undefined') {
          ApiService.fetchAll().then(res => {
            if (res && res.source === 'cloud' && typeof AppModule !== 'undefined') {
              AppModule.refresh();
              AppModule.updateCloudSyncBadge(true);
            } else if (typeof AppModule !== 'undefined') {
              AppModule.updateCloudSyncBadge(false, res && res.source !== 'offline', res && res.source === 'offline');
              if (res && res.source === 'offline') AppModule.refresh();
              if (res && res.status === 'error') AppModule.showToast('Cloud data could not be loaded. No cached data was treated as synchronized.');
            }
          }).catch(err => {
            console.error('Cloud sync failed after sign-in:', err);
          });
        }
      } else {
        if (errBox) {
          errBox.style.display = 'block';
          errBox.innerText = result && result.message ? result.message : 'Sign-in failed. Check your credentials and try again.';
        }
        if (pwdInput) {
          pwdInput.value = '';
          pwdInput.focus();
        }
      }
    } finally {
      this._isSigningIn = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerText = originalButtonText;
      }
    }
  },

  logout() {
    if (typeof ApiService !== 'undefined' && this._sessionToken) {
      ApiService.logout().catch(error => console.error('Could not revoke the server session:', error));
    }
    this.clearInactivityTimer();
    this._sessionToken = null;
    this._currentUser = null;
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem('broker_pwd_override_admin');
      localStorage.removeItem('broker_pwd_override_rudra');
    } catch (error) {
      console.error('Could not clear legacy browser credentials:', error);
    }
    if (typeof DataManager !== 'undefined') {
      try {
        DataManager.saveAll([]);
      } catch (error) {
        console.error('Could not clear the local shipment cache on logout:', error);
      }
    }
    const authWrapper = document.getElementById('authWrapper');
    const appWrapper = document.getElementById('appWrapper');

    if (appWrapper) appWrapper.style.display = 'none';
    if (authWrapper) authWrapper.style.display = 'flex';
    this.selectLoginUser('Admin');
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'admin';
  },

  canDelete() {
    const user = this.getCurrentUser();
    return user && user.permissions && user.permissions.canDelete === true;
  },

  updateHeaderUI() {
    const user = this.getCurrentUser() || this.accounts.admin;
    const isAdmin = (user.role === 'admin');
    const userDisplay = document.getElementById('currentUserDisplay');
    const roleBadge = document.getElementById('currentUserRoleBadge');
    const drawerUser = document.getElementById('drawerUserName');
    const drawerRole = document.getElementById('drawerUserRole');
    const settingsUser = document.getElementById('settingsSessionUser');

    if (userDisplay) {
      userDisplay.innerText = user.displayName;
    }
    if (drawerUser) {
      drawerUser.innerText = user.displayName;
    }
    if (settingsUser) {
      settingsUser.innerText = `${user.displayName} (${user.role.toUpperCase()})`;
    }
    if (roleBadge) {
      roleBadge.innerText = user.role.toUpperCase();
      roleBadge.style.backgroundColor = user.badgeColor;
      roleBadge.style.color = '#ffffff';
    }
    if (drawerRole) {
      drawerRole.innerText = user.role.toUpperCase();
    }

    // Role-Based UI Visibility: Hide Admin-only controls from Employee (Rudra)
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });
  },

  changePassword() {
    const input = document.getElementById('newPasswordInput');
    if (!input || !input.value.trim()) {
      alert('Please enter a new password.');
      return;
    }
    const newPwd = input.value;
    if (newPwd.length < 12 || newPwd.length > 256) {
      alert('Password must contain 12 to 256 characters.');
      return;
    }
    if (typeof ApiService === 'undefined' || !this._sessionToken) {
      alert('Sign in before changing the account password.');
      return;
    }
    const saveButton = input.parentElement.querySelector('button');
    if (saveButton) saveButton.disabled = true;
    ApiService.changePassword(newPwd).then(result => {
      if (result && result.status === 'success' && result.sessionToken) {
        this._sessionToken = result.sessionToken;
        input.value = '';
        if (typeof AppModule !== 'undefined') {
          AppModule.showToast('Password updated securely.');
          AppModule.closeSettingsModal();
        }
      } else {
        alert(result && result.message ? result.message : 'Password update failed.');
      }
    }).catch(error => {
      console.error('Password update failed:', error);
      alert('Password update failed. Please retry when the cloud service is available.');
    }).finally(() => {
      if (saveButton) saveButton.disabled = false;
    });
  }
};

window.AuthModule = AuthModule;

// Auto initialize on script load
document.addEventListener('DOMContentLoaded', () => {
  AuthModule.init();
});
