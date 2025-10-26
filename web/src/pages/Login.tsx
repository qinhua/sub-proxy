import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Space,
  Alert,
  Spin,
  Avatar
} from "antd";
import { UserOutlined, LockOutlined, LoginOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import ImgLogo from "../assets/img/logo.jpg";
import { api } from "../api";

const { Title, Text } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { login } = useAuth();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    setError("");

    try {
      const data = await api.login(values.username, values.password);
      if (data.success) {
        // 使用 AuthContext 的 login 方法更新认证状态
        login(data.data.token, data.data.user);
      } else {
        setError(data.message || "登录失败");
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          borderRadius: "16px",
          border: "none"
        }}
        styles={{ body: { padding: "40px" } }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Avatar size={80} src={ImgLogo} style={{ marginBottom: "10px" }} />
          <Title
            level={2}
            style={{ margin: 0, fontWeight: 700, color: "#1f2937" }}
          >
            SubProxy
          </Title>
          <Text type="secondary" style={{ fontSize: "16px" }}>
            订阅代理管理系统
          </Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          // initialValues={{ username: "admin", password: "admin123456" }}
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: "请输入用户名" },
              { min: 3, message: "用户名至少3个字符" }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
              placeholder="用户名"
              style={{ borderRadius: "8px" }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 6, message: "密码至少6个字符" }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
              placeholder="密码"
              style={{ borderRadius: "8px" }}
            />
          </Form.Item>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginTop: "-10px", marginBottom: "10px" }}
            />
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              icon={<LoginOutlined />}
              style={{
                height: "48px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                fontSize: "16px",
                fontWeight: "500"
              }}
            >
              {loading ? "登录中..." : "登录"}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
