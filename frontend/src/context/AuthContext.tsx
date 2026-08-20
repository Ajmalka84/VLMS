import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { AuthUser, LoginCredentials, getMeApi, loginApi } from '../api/auth';
import { AUTH_TOKEN_KEY } from '../api/client';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(AUTH_TOKEN_KEY),
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const restoreSession = useCallback(async () => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await getMeApi();
      setUser(profile);
      setToken(storedToken);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // Cross-tab Synchronization & Global Unauthorized Listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_TOKEN_KEY) {
        if (!e.newValue) {
          // Token was removed in another tab -> instantly log out this tab
          setUser(null);
          setToken(null);
        } else if (e.newValue !== token) {
          // Token changed in another tab -> re-restore session
          void restoreSession();
        }
      }
    };

    const handleUnauthorizedEvent = () => {
      logout();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('vlms:unauthorized', handleUnauthorizedEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('vlms:unauthorized', handleUnauthorizedEvent);
    };
  }, [token, logout, restoreSession]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const result = await loginApi(credentials);
      localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken);
      setToken(result.accessToken);
      setUser(result.user);
      return result.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
