import { useState } from "react";
import {
  Card,
  Button,
  message,
  Row,
  Col,
  Divider,
  Typography,
  Space,
  Alert,
  Upload,
  Tag
} from "antd";
import {
  DownloadOutlined,
  UploadOutlined,
  SettingOutlined,
  DatabaseOutlined,
  SecurityScanOutlined,
  InfoCircleOutlined
} from "@ant-design/icons";
import { api, API_BASE_URL } from "../api";
import { getSubscriptionBaseUrl } from "../utils/subscriptionUrl";

export function Settings() {
  // const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  const handleExportBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await api.exportBackup();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sub-proxy-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("备份已导出");
    } catch (error) {
      message.error("导出失败");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 检查是否是API响应格式
      if (data.success && data.data) {
        // 这是从API导出的格式
        await api.importBackup(data.data);
      } else if (data.subscriptions && data.settings) {
        // 这是直接的数据库格式
        await api.importBackup(data);
      } else {
        throw new Error("不支持的文件格式");
      }

      message.success("导入成功，即将刷新页面。。");
      // 延迟刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      message.error(error?.message || "导入失败，请检查文件格式");
    }
    return false;
  };

  return (
    <div className="max-w p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <Typography.Title level={3} className="mb-4 flex items-center">
          <SettingOutlined className="mr-2" />
          系统设置
        </Typography.Title>
        <Typography.Text type="secondary">
          管理系统配置、数据备份和恢复功能
        </Typography.Text>
      </div>

      {/* 基础设置 */}
      <Row gutter={24}>
        <Col span={16} style={{ alignContent: "stretch" }}>
          <Card
            title={
              <Space>
                <SettingOutlined />
                基础设置
              </Space>
            }
            className="shadow-lg h-full"
          >
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <InfoCircleOutlined className="text-blue-500 mr-2" />
                  <Typography.Text strong className="text-blue-700">
                    基础 URL 自动配置
                  </Typography.Text>
                </div>
                <Typography.Text type="secondary" className="block mb-3">
                  系统已自动配置基础 URL，无需手动设置
                </Typography.Text>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Typography.Text>当前环境：</Typography.Text>
                    {process.env.NODE_ENV === "development" ? (
                      <Tag color="orange">开发环境</Tag>
                    ) : (
                      <Tag color="green">生产环境</Tag>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <Typography.Text>API 基础 URL：</Typography.Text>
                    <Typography.Text code>{API_BASE_URL}</Typography.Text>
                  </div>
                  <div className="flex justify-between items-center">
                    <Typography.Text>订阅基础 URL：</Typography.Text>
                    <Typography.Text code>
                      {getSubscriptionBaseUrl()}
                    </Typography.Text>
                  </div>
                </div>
              </div>

              <Alert
                message="自动配置说明"
                description={
                  <div>
                    <p>• 开发环境：自动使用当前局域网 IP 地址 + 3001 端口</p>
                    <p>• 生产环境：自动使用当前访问的域名和端口</p>
                    <p>• 无需手动配置，系统会根据环境自动调整</p>
                  </div>
                }
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
              />
            </div>
          </Card>
        </Col>

        {/* 系统信息 */}
        <Col span={8} style={{ alignContent: "stretch" }}>
          <Card
            title={
              <Space>
                <InfoCircleOutlined />
                系统信息
              </Space>
            }
            className="shadow-lg"
            style={{ height: "100%" }}
          >
            <Space
              direction="vertical"
              className="w-full"
              size="middle"
              style={{ gap: 10 }}
            >
              {/* 应用信息 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <Typography.Text type="secondary" className="text-xs">
                  应用版本
                </Typography.Text>
                <Typography.Text strong className="block text-lg">
                  SubProxy v1.0.0
                </Typography.Text>
                <Typography.Text type="secondary" className="text-xs">
                  订阅代理管理系统
                </Typography.Text>
              </div>

              {/* 技术栈 */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <Typography.Text type="secondary" className="text-xs">
                  技术栈
                </Typography.Text>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Tag color="blue">React 18</Tag>
                  <Tag color="green">Ant Design</Tag>
                  <Tag color="orange">Koa.js</Tag>
                  <Tag color="purple">TypeScript</Tag>
                </div>
              </div>

              {/* 运行环境 */}
              <div className="p-3 bg-green-50 rounded-lg">
                <Typography.Text type="secondary" className="text-xs">
                  运行环境
                </Typography.Text>
                <Typography.Text strong className="block">
                  {process.env.NODE_ENV === "development"
                    ? "开发环境"
                    : "生产环境"}
                </Typography.Text>
                <Typography.Text type="secondary" className="text-xs">
                  {navigator.userAgent.includes("Chrome")
                    ? "Chrome"
                    : navigator.userAgent.includes("Firefox")
                      ? "Firefox"
                      : navigator.userAgent.includes("Safari")
                        ? "Safari"
                        : "其他浏览器"}
                </Typography.Text>
              </div>

              {/* 系统状态 */}
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Typography.Text type="secondary" className="text-xs">
                  系统状态
                </Typography.Text>
                <div className="flex items-center justify-between mt-1">
                  <Typography.Text strong>运行正常</Typography.Text>
                  <Tag color="green">在线</Tag>
                </div>
                <Typography.Text type="secondary" className="text-xs">
                  最后更新: {new Date().toLocaleString()}
                </Typography.Text>
              </div>

              {/* 性能信息 */}
              <div className="p-3 bg-purple-50 rounded-lg">
                <Typography.Text type="secondary" className="text-xs">
                  性能信息
                </Typography.Text>
                <div className="space-y-1 mt-1">
                  <div className="flex justify-between">
                    <Typography.Text className="text-xs">
                      内存使用:
                    </Typography.Text>
                    <Typography.Text className="text-xs">
                      {(performance as any).memory
                        ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB`
                        : "N/A"}
                    </Typography.Text>
                  </div>
                  <div className="flex justify-between">
                    <Typography.Text className="text-xs">
                      页面加载:
                    </Typography.Text>
                    <Typography.Text className="text-xs">
                      {Math.round(performance.now())}ms
                    </Typography.Text>
                  </div>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 数据管理 */}
      <Card
        title={
          <Space>
            <DatabaseOutlined />
            数据管理
          </Space>
        }
        className="shadow-lg"
      >
        <Row gutter={24}>
          <Col span={12}>
            <div className="text-center p-6 border border-dashed border-gray-300 rounded-lg">
              <DatabaseOutlined className="text-4xl text-blue-500 mb-4" />
              <Typography.Title level={4} className="mb-2">
                导出备份
              </Typography.Title>
              <Typography.Text type="secondary" className="block mb-4">
                将当前订阅数据和设置导出为 JSON 文件（不包含用户信息）
              </Typography.Text>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="large"
                loading={backupLoading}
                onClick={handleExportBackup}
              >
                导出备份
              </Button>
            </div>
          </Col>

          <Col span={12}>
            <div className="text-center p-6 border border-dashed border-gray-300 rounded-lg">
              <UploadOutlined className="text-4xl text-green-500 mb-4" />
              <Typography.Title level={4} className="mb-2">
                导入备份
              </Typography.Title>
              <Typography.Text type="secondary" className="block mb-4">
                从 JSON 文件恢复订阅数据和设置（不会影响现有用户信息）
              </Typography.Text>
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={handleImportBackup}
              >
                <Button type="default" icon={<UploadOutlined />} size="large">
                  选择文件导入
                </Button>
              </Upload>
            </div>
          </Col>
        </Row>

        <Divider />

        <Alert
          message="数据安全提示"
          description={
            <div>
              <p>• 定期备份数据，避免数据丢失</p>
              <p>• 备份文件包含所有订阅配置和系统设置</p>
              <p>• 导入备份将覆盖当前所有数据，请谨慎操作</p>
              <p>• 建议在重要操作前先导出备份</p>
            </div>
          }
          type="info"
          showIcon
          icon={<SecurityScanOutlined />}
        />
      </Card>
    </div>
  );
}
