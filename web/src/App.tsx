import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Space,
  Typography,
  Spin
} from "antd";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  Navigate
} from "react-router-dom";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
  UnorderedListOutlined
} from "@ant-design/icons";
import { useState, useEffect } from "react";
import { SubscriptionList } from "./pages/SubscriptionList";
import { SubscriptionForm } from "./pages/SubscriptionForm";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import IconGitHub from "./assets/icon/svg/IconGitHub";
import { generateAvatarUrl } from "./utils";
import { Settings } from "./pages/Settings";
import { Profile } from "./pages/Profile";
import Login from "./pages/Login";
import ImgLogo from "./assets/img/logo.jpg";
import { initializeSubscriptionBaseUrl } from "./utils/subscriptionUrl";

const { Header } = Layout;
const { Text } = Typography;

// 主应用布局组件
function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  // 初始化订阅基础 URL
  useEffect(() => {
    initializeSubscriptionBaseUrl().catch(console.error);
  }, []);

  const getSelectedKey = () => {
    if (location.pathname.startsWith("/settings")) return ["settings"];
    if (location.pathname.startsWith("/create")) return ["create"];
    if (location.pathname.startsWith("/edit/")) return ["create"];
    if (location.pathname.startsWith("/profile")) return ["profile"];
    return ["home"];
  };

  const menuItems = [
    {
      key: "home",
      icon: <UnorderedListOutlined />,
      label: <Link to="/">订阅列表</Link>
    },
    {
      key: "create",
      icon: <PlusOutlined />,
      label: <Link to="/create">创建订阅</Link>
    }
  ];

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "个人中心"
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "系统设置"
    },
    {
      type: "divider" as const
    },
    // {
    //   key: "help",
    //   icon: <QuestionCircleOutlined />,
    //   label: "帮助中心"
    // },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录"
    }
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case "profile":
        navigate("/profile");
        break;
      case "settings":
        navigate("/settings");
        break;
      case "help":
        // 处理帮助
        break;
      case "logout":
        logout();
        navigate("/login");
        break;
    }
  };

  return (
    <div
      style={{
        maxWidth: 3840,
        minWidth: 1200,
        margin: "0 auto",
        height: "100vh",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* 顶部标题栏 - 固定 */}
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "#001529",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          height: 66,
          flexShrink: 0,
          zIndex: 1000
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <a href="/" style={{ display: "flex", alignItems: "center" }}>
            <Avatar
              className="animate-pulse"
              size={44}
              src={ImgLogo}
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>
              SubProxy
            </Text>
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Button
            type="link"
            icon={<IconGitHub />}
            style={{ fontSize: 24, color: "#fff" }}
            href="https://github.com/qinhua/sub-proxy"
            target="_blank"
            rel="noopener noreferrer"
          />

          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: handleUserMenuClick
            }}
            placement="bottomRight"
            arrow
          >
            <Space align="center" style={{ cursor: "pointer", color: "#fff" }}>
              <Avatar
                icon={!user?.avatar ? <UserOutlined /> : undefined}
                src={
                  user?.avatar
                    ? generateAvatarUrl(user?.avatar, true)
                    : undefined
                }
                style={{ backgroundColor: "#333" }}
              />
              <Text style={{ color: "#fff" }}>
                {user?.username || "管理员"}
              </Text>
            </Space>
          </Dropdown>
        </div>
      </Header>

      {/* 主体区域 - 包含菜单和内容 */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* 左侧菜单 - 固定高度 */}
        <div
          style={{
            width: collapsed ? 60 : 250,
            background: "#fff",
            boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
            height: "100%",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            transition: "width 0.2s"
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={getSelectedKey()}
            items={menuItems.map(item => ({
              ...item,
              label: collapsed ? "" : item.label,
              style: {
                justifyContent: collapsed ? "center" : "flex-start",
                height: 50,
                // paddingLeft: 14,
                paddingRight: 14
              }
            }))}
            style={{
              flex: 1,
              borderRight: 0,
              paddingTop: 16,
              fontWeight: 600,
              fontSize: 16
            }}
          />
          {/* 菜单底部折叠按钮 */}
          <div
            style={{
              padding: "8px 10px 8px 0",
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              justifyContent: "flex-end",
              flexShrink: 0
            }}
          >
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: "16px",
                color: "#666",
                border: "none",
                boxShadow: "none"
              }}
              title={collapsed ? "展开菜单" : "折叠菜单"}
            />
          </div>
        </div>

        {/* 右侧内容区域 - 可滚动 */}
        <div
          style={{
            flex: 1,
            background: "#f7f7f7",
            overflow: "auto",
            padding: "24px 16px"
          }}
        >
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <SubscriptionList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <SubscriptionForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit/:id"
              element={
                <ProtectedRoute>
                  <SubscriptionForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

// 主应用组件
export function App() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // 显示加载状态
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // 如果未认证，显示登录页面
  if (!isAuthenticated) {
    return <Login />;
  }

  // 如果已认证且在登录页面，重定向到主页
  if (isAuthenticated && location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  // 如果已认证，显示主应用布局
  return <MainLayout />;
}
