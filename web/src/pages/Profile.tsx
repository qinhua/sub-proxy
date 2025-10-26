import { useEffect, useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Row,
  Col,
  Typography,
  Space,
  Avatar,
  Upload,
  Divider,
  Alert,
  Modal
} from "antd";
import {
  UserOutlined,
  CameraOutlined,
  EditOutlined,
  SaveOutlined,
  SecurityScanOutlined
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { generateAvatarUrl, LogoutSystem } from "../utils";
import { api } from "../api";

const { Title, Text } = Typography;

export function Profile() {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const { user, login } = useAuth();

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const response = await api.getProfile();
        const userProfile = response.data;

        if (userProfile) {
          form.setFieldsValue({
            username: userProfile.username,
            email: userProfile.email || "",
            phone: userProfile.phone || "",
            avatar: userProfile.avatar
          });
        }
      } catch (error) {
        console.error("加载用户信息失败:", error);
        // 如果 API 失败，使用本地用户信息
        if (user) {
          form.setFieldsValue({
            username: user.username,
            email: user.email || "",
            phone: user.phone || "",
            avatar: user.avatar
          });
        }
      }
    };

    loadUserProfile();
  }, [form]);

  const handleProfileUpdate = async (values: any) => {
    setLoading(true);
    try {
      await api.updateProfile(values);
      message.success("个人信息更新成功");
      // 更新本地用户信息
      if (user) {
        const updatedUser = {
          ...user,
          ...values,
          avatar: values.avatar
        };
        login(localStorage.getItem("token") || "", updatedUser);
      }
    } catch (error: any) {
      message.error(error?.message || "更新失败");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (values: any) => {
    setPasswordLoading(true);
    try {
      await api.changePassword(values);
      message.success("密码修改成功");
      setPasswordModalVisible(false);
      passwordForm.resetFields();
      setTimeout(() => {
        LogoutSystem();
      }, 500);
    } catch (error: any) {
      message.error(error?.message || "密码修改失败");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    // 文件验证
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      message.error("只能上传图片文件！");
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error("图片大小不能超过 5MB！");
      return false;
    }

    // 创建预览 URL
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    setAvatarLoading(true);
    try {
      const response = await api.uploadAvatar(file);
      const avatarUrl = response.data?.avatarUrl;

      if (avatarUrl) {
        // 更新本地用户信息
        if (user) {
          const updatedUser = { ...user, avatar: avatarUrl };
          login(localStorage.getItem("token") || "", updatedUser);
        }

        // 清理预览 URL
        URL.revokeObjectURL(previewUrl);
        // setAvatarPreview("");

        message.success("头像上传成功");
      } else {
        message.error("头像上传失败");
        // 清理预览 URL
        URL.revokeObjectURL(previewUrl);
        setAvatarPreview("");
      }

      return false; // 阻止默认上传行为
    } catch (error) {
      message.error("头像上传失败");
      // 清理预览 URL
      URL.revokeObjectURL(previewUrl);
      setAvatarPreview("");
      return false;
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="max-w p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <Title level={3} className="mb-4 flex items-center">
          <UserOutlined className="mr-2" />
          个人中心
        </Title>
        <Text type="secondary">管理您的个人信息和账户设置</Text>
      </div>

      {/* 个人信息卡片 */}
      <Row gutter={24}>
        <Col span={16}>
          <Card
            title={
              <Space>
                <UserOutlined />
                个人信息
              </Space>
            }
            className="shadow-lg"
          >
            <Form form={form} layout="vertical" onFinish={handleProfileUpdate}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="用户名"
                    name="username"
                    rules={[
                      { required: true, message: "请输入用户名" },
                      { min: 3, message: "用户名至少3个字符" }
                    ]}
                  >
                    <Input
                      placeholder="请输入用户名"
                      size="large"
                      prefix={<UserOutlined />}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[{ type: "email", message: "请输入有效的邮箱地址" }]}
                  >
                    <Input placeholder="请输入邮箱地址" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="手机号"
                    name="phone"
                    rules={[
                      {
                        pattern: /^1[3-9]\d{9}$/,
                        message: "请输入有效的手机号"
                      }
                    ]}
                  >
                    <Input placeholder="请输入手机号" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="注册时间">
                    <Input
                      value={
                        user?.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "未知"
                      }
                      size="large"
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  icon={<SaveOutlined />}
                >
                  保存信息
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 头像设置 */}
        <Col span={8}>
          <Card
            title={
              <Space>
                <CameraOutlined />
                头像设置
              </Space>
            }
            className="shadow-lg"
            style={{ height: "100%" }}
          >
            <div className="text-center">
              <Avatar
                size={120}
                src={
                  avatarPreview ||
                  (user?.avatar ? generateAvatarUrl(user.avatar, true) : "")
                }
                icon={<UserOutlined />}
                className="mb-4"
                style={{ fontSize: "48px" }}
              />

              <Space direction="vertical" className="w-full">
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={handleAvatarUpload}
                  multiple={false}
                >
                  <Button
                    type="primary"
                    icon={<CameraOutlined />}
                    loading={avatarLoading}
                    size="large"
                    block
                  >
                    {avatarLoading ? "上传中..." : "更换头像"}
                  </Button>
                </Upload>

                <Typography.Text type="secondary" className="text-xs">
                  支持 JPG、PNG、GIF 格式，大小不超过 5MB
                </Typography.Text>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 账户安全 */}
      <Card
        title={
          <Space>
            <SecurityScanOutlined />
            账户安全
          </Space>
        }
        className="shadow-lg"
      >
        <Row gutter={24}>
          <Col span={12}>
            <div className="p-4 border border-gray-200 rounded-lg">
              <Space direction="vertical" className="w-full">
                <div>
                  <Title level={5} className="mb-2">
                    密码安全
                  </Title>
                  <Text type="secondary" className="block mb-3">
                    定期修改密码，确保账户安全
                  </Text>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => setPasswordModalVisible(true)}
                  >
                    修改密码
                  </Button>
                </div>
              </Space>
            </div>
          </Col>

          <Col span={12}>
            <div className="p-4 border border-gray-200 rounded-lg">
              <Space direction="vertical" className="w-full">
                <div>
                  <Title level={5} className="mb-2">
                    登录记录
                  </Title>
                  <Text type="secondary" className="block mb-3">
                    最后登录时间：
                    {user?.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString()
                      : "未知"}
                  </Text>
                  <Button type="default" disabled>
                    查看详情
                  </Button>
                </div>
              </Space>
            </div>
          </Col>
        </Row>

        <Divider />

        <Alert
          message="安全提示"
          description={
            <div>
              <p>• 请使用强密码，包含字母、数字和特殊字符</p>
              <p>• 定期修改密码，不要与他人共享账户信息</p>
              <p>• 如发现异常登录，请立即修改密码</p>
            </div>
          }
          type="info"
          showIcon
          icon={<SecurityScanOutlined />}
        />
      </Card>

      {/* 修改密码模态框 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        maskClosable={false}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
        >
          <Form.Item
            label="当前密码"
            name="currentPassword"
            rules={[{ required: true, message: "请输入当前密码" }]}
          >
            <Input.Password placeholder="请输入当前密码" size="large" />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 6, message: "密码至少6个字符" }
            ]}
          >
            <Input.Password placeholder="请输入新密码" size="large" />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请确认新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                }
              })
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" size="large" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setPasswordModalVisible(false)}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={passwordLoading}
                icon={<SaveOutlined />}
              >
                确认修改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
