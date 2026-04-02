import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from "react";

interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      // 从 localStorage 恢复认证状态
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      const storedVersion = localStorage.getItem("appVersion");

      if (storedToken && storedUser) {
        try {
          // 检查应用版本
          const versionResponse = await fetch("/api/version");
          if (versionResponse.ok) {
            const versionData = await versionResponse.json();
            const currentVersion = versionData.data.version;

            // 如果版本不匹配，清除认证状态
            if (storedVersion && storedVersion !== currentVersion) {
              console.log("应用版本已更新，清除本地认证信息");
              logout();
              setLoading(false);
              return;
            }

            const userData = JSON.parse(storedUser);
            setToken(storedToken);
            setUser(userData);

            // 验证 token 是否仍然有效
            await verifyToken(storedToken, currentVersion);
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error("Failed to check app version:", error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const verifyToken = async (tokenToVerify: string, currentVersion: string) => {
    try {
      const response = await fetch("/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${tokenToVerify}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 保存当前版本到 localStorage
          localStorage.setItem("appVersion", currentVersion);
          setLoading(false);
          return;
        }
      }

      // Token 无效，清除认证状态
      logout();
    } catch (error) {
      console.error("Token verification failed:", error);
      logout();
    }
  };

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));

    // 保存当前版本到 localStorage
    fetch("/api/version")
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem("appVersion", data.data.version);
        }
      })
      .catch(error => {
        console.error("Failed to save app version:", error);
      });

    setLoading(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("appVersion");
    setLoading(false);
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
