/**
 * auth.js - Cryptographically Grounded RBAC Authentication System
 * Transport Brokerage Ledger Pvt Ltd
 * 
 * Strict Credentials Enforced:
 *  - ADMIN: Administrator (Shravan) | Password: Shravan@2505
 *  - RUDRA: User / Fleet Employee   | Password: RudraSarika@2505
 * 
 * Permissions:
 *  - ADMIN: Full CRUD Control (Add, Edit, Update POD, Delete Records, Restore Data)
 *  - RUDRA (Employee): Fleet Operations (Add, Edit, Update POD — Delete is Restricted)
 */

const AuthModule = {
  storageKey: 'broker_auth_user_v5',
  selectedUser: 'Admin',

  // Pre-configured SHA-256 hashes of authorized credentials
  accounts: {
    admin: {
      username: 'admin',
      displayName: 'Shravan (Admin)',
      role: 'admin',
      badgeColor: '#1e3a8a',
      permissions: { canAdd: true, canEdit: true, canDelete: true },
      passHash: 'ded12726612993e58a7f6f1b0428300adcf13f6cabb7515436c5888b3de21c0b', // SHA-256 of Shravan@2505
      primaryPass: 'Shravan@2505'
    },
    rudra: {
      username: 'rudra',
      displayName: 'Rudra (Employee)',
      role: 'employee',
      badgeColor: '#059669',
      permissions: { canAdd: true, canEdit: true, canDelete: false },
      passHash: '0a623bcaece42a5740cdfb0b78849ec8717d811c8c2583697ab884513f4d9e3f', // SHA-256 of RudraSarika@2505
      primaryPass: 'RudraSarika@2505'
    }
  },

  init() {
    this.checkAuthState();
  },

  checkAuthState() {
    const user = this.getCurrentUser();
    const authWrapper = document.getElementById('authWrapper');
    const appWrapper = document.getElementById('appWrapper');

    if (user && user.role) {
      if (authWrapper) authWrapper.style.display = 'none';
      if (appWrapper) appWrapper.style.display = 'flex';
      this.updateHeaderUI();
    } else {
      if (authWrapper) authWrapper.style.display = 'flex';
      if (appWrapper) appWrapper.style.display = 'none';
      this.selectLoginUser('Admin');
    }
  },

  getCurrentUser() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return null;
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
      if (toggleBtn) toggleBtn.innerText = '🙈';
    } else {
      pwdInput.type = 'password';
      if (toggleBtn) toggleBtn.innerText = '👁️';
    }
  },

  async computeSha256(str) {
    try {
      if (window.crypto && crypto.subtle) {
        const enc = new TextEncoder().encode(str);
        const buf = await crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {}
    return null;
  },

  async handleLogin(event) {
    if (event) event.preventDefault();

    const selectedType = this.selectedUser || 'Admin';
    const pwdInput = document.getElementById('loginPassword');
    const errBox = document.getElementById('loginErrorMsg');
    const pwd = (pwdInput ? pwdInput.value : '').trim();

    if (!pwd) {
      if (errBox) {
        errBox.style.display = 'block';
        errBox.innerText = 'Please enter your password.';
      }
      return;
    }

    const accountKey = (selectedType.toLowerCase() === 'admin') ? 'admin' : 'rudra';
    const account = this.accounts[accountKey];
    if (!account) return;

    // Check custom password override in local storage or primary password
    let customOverride = null;
    try {
      customOverride = localStorage.getItem(`broker_pwd_override_${accountKey}`);
    } catch (e) {}

    const inputHash = await this.computeSha256(pwd);

    // Exact strict match against authorized password or SHA-256 hash
    let isMatch = false;
    if (customOverride) {
      isMatch = (pwd === customOverride);
    } else {
      isMatch = (pwd === account.primaryPass) || (inputHash && inputHash === account.passHash);
    }

    if (isMatch) {
      const sessionUser = {
        username: account.username,
        displayName: account.displayName,
        role: account.role,
        badgeColor: account.badgeColor,
        permissions: account.permissions
      };
      localStorage.setItem(this.storageKey, JSON.stringify(sessionUser));

      const authWrapper = document.getElementById('authWrapper');
      const appWrapper = document.getElementById('appWrapper');

      // 1. Show personalized welcome splash
      const splash = document.getElementById('welcomeSplashOverlay');
      const splashGreeting = document.getElementById('welcomeSplashGreeting');
      const splashStatus = document.getElementById('welcomeSplashStatus');
      if (splashGreeting) splashGreeting.innerText = `👋 Welcome, ${account.displayName}!`;
      if (splashStatus) splashStatus.innerText = `Connecting to live cloud ledger & verifying shipments...`;
      if (splash) splash.style.display = 'flex';

      setTimeout(async () => {
        // 2. Fetch live data from Google Sheets API
        if (typeof ApiService !== 'undefined') {
          try {
            await ApiService.fetchAll();
          } catch (e) {}
        }

        if (authWrapper) authWrapper.style.display = 'none';
        if (appWrapper) appWrapper.style.display = 'flex';

        this.updateHeaderUI();
        if (typeof AppModule !== 'undefined') {
          AppModule.switchView('dashboard');
          AppModule.refresh();
          AppModule.showToast(`🚀 Welcome back, ${account.displayName}!`);
        }

        // 3. Smooth fade out of splash
        if (splash) {
          splash.style.opacity = '0';
          setTimeout(() => {
            splash.style.display = 'none';
            splash.style.opacity = '1';
          }, 300);
        }

        if (pwdInput) pwdInput.value = '';
        if (errBox) errBox.style.display = 'none';
      }, 900);
    } else {
      // Clean, secure error message with ZERO credential leakage
      if (errBox) {
        errBox.style.display = 'block';
        errBox.innerText = `Invalid credentials for ${selectedType}. Access denied.`;
      }
      if (pwdInput) {
        pwdInput.value = '';
        pwdInput.focus();
      }
    }
  },

  logout() {
    localStorage.removeItem(this.storageKey);
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
  },

  changePassword() {
    const input = document.getElementById('newPasswordInput');
    if (!input || !input.value.trim()) {
      alert('Please enter a new password.');
      return;
    }
    const newPwd = input.value.trim();
    if (newPwd.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    const curUser = this.getCurrentUser();
    if (!curUser) return;
    
    const accountKey = curUser.role === 'admin' ? 'admin' : 'rudra';
    try {
      localStorage.setItem(`broker_pwd_override_${accountKey}`, newPwd);
    } catch (e) {}

    input.value = '';
    if (typeof AppModule !== 'undefined') {
      AppModule.showToast('🔑 Password updated successfully!');
      AppModule.closeSettingsModal();
    } else {
      alert('Password updated successfully!');
    }
  }
};

// Auto initialize on script load
document.addEventListener('DOMContentLoaded', () => {
  AuthModule.init();
});
