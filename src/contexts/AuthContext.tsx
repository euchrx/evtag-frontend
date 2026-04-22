import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../services/api';

export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'OPERATOR';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string | null;
  company?: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
};

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  companyName: string;
  userName: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (companyId: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'evtag_token';
const ROLE_KEY = 'evtag_user_role';
const SELECTED_COMPANY_KEY = 'evtag_selected_company_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(
    localStorage.getItem(SELECTED_COMPANY_KEY),
  );
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = useCallback(
    (nextToken: string, nextUser: AuthUser) => {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(ROLE_KEY, nextUser.role);

      if (nextUser.role === 'SUPER_ADMIN') {
        const companyId = selectedCompanyId ?? null;

        if (companyId) {
          localStorage.setItem(SELECTED_COMPANY_KEY, companyId);
        } else {
          localStorage.removeItem(SELECTED_COMPANY_KEY);
        }
      } else {
        const companyId = nextUser.companyId ?? null;

        if (companyId) {
          localStorage.setItem(SELECTED_COMPANY_KEY, companyId);
          setSelectedCompanyIdState(companyId);
        } else {
          localStorage.removeItem(SELECTED_COMPANY_KEY);
          setSelectedCompanyIdState(null);
        }
      }

      setToken(nextToken);
      setUser(nextUser);
    },
    [selectedCompanyId],
  );

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(SELECTED_COMPANY_KEY);
    setToken(null);
    setUser(null);
    setSelectedCompanyIdState(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);

    if (!currentToken) {
      setUser(null);
      return;
    }

    const { data } = await api.get<AuthUser>('/auth/me');
    setUser(data);

    localStorage.setItem(ROLE_KEY, data.role);

    if (data.role !== 'SUPER_ADMIN') {
      const companyId = data.companyId ?? null;

      if (companyId) {
        localStorage.setItem(SELECTED_COMPANY_KEY, companyId);
        setSelectedCompanyIdState(companyId);
      } else {
        localStorage.removeItem(SELECTED_COMPANY_KEY);
        setSelectedCompanyIdState(null);
      }
    }
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const { data } = await api.post<{
        access_token: string;
        user: AuthUser;
      }>('/auth/login', input);

      persistSession(data.access_token, data.user);
    },
    [persistSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const { data } = await api.post<{
        access_token: string;
        user: AuthUser;
      }>('/auth/register', input);

      persistSession(data.access_token, data.user);
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const setSelectedCompanyId = useCallback(
    (companyId: string | null) => {
      if (companyId) {
        localStorage.setItem(SELECTED_COMPANY_KEY, companyId);
      } else {
        localStorage.removeItem(SELECTED_COMPANY_KEY);
      }

      setSelectedCompanyIdState(companyId);
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const currentToken = localStorage.getItem(TOKEN_KEY);

        if (!currentToken) {
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        await refreshMe();
      } catch {
        clearSession();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [refreshMe, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      register,
      logout,
      refreshMe,
      selectedCompanyId,
      setSelectedCompanyId,
    }),
    [
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      refreshMe,
      selectedCompanyId,
      setSelectedCompanyId,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}