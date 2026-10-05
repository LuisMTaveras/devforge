import { ref, computed } from 'vue';
import { tokenStorage } from '../../core/auth/auth-token.js';
import { globalAbility } from '../../core/permissions/ability.js';

export interface UserProfile {
  id: string | number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  permissions?: string[];
}

export function createAuthStoreDefinition() {
  const user = ref<UserProfile | null>(null);
  const isLoading = ref(false);

  const isAuthenticated = computed(() => {
    return !!user.value && !tokenStorage.isTokenExpired();
  });

  const userRole = computed(() => user.value?.role || 'guest');

  function setUser(profile: UserProfile | null) {
    user.value = profile;
    globalAbility.setUser(profile as any);

    if (profile?.permissions) {
      globalAbility.updateRules(
        profile.permissions.map(perm => {
          const [action, subject] = perm.split(':');
          return { action: action as any, subject: subject || 'all' };
        })
      );
    }
  }

  function setSession(accessToken: string, refreshToken?: string, profile?: UserProfile) {
    tokenStorage.setSession(accessToken, refreshToken);
    if (profile) {
      setUser(profile);
    }
  }

  function logout(redirectToLogin?: () => void) {
    tokenStorage.clearSession();
    user.value = null;
    globalAbility.setUser(null);
    globalAbility.updateRules([]);
    if (redirectToLogin) {
      redirectToLogin();
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    userRole,
    setUser,
    setSession,
    logout,
  };
}
