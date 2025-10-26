import { useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  DatePicker,
  Switch,
  InputNumber,
  Button,
  Space,
  message,
  Typography,
  Card,
  Row,
  Col,
  Divider
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import dayjs from "dayjs";
import { api } from "../api";

export function SubscriptionForm() {
  const navigate = useNavigate();
  const params = useParams();
  const isEdit = Boolean(params.id);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [yaml, setYaml] = useState(
    "# 在此粘贴Clash配置\nproxies: []\nproxy-groups: []\nrules: []"
  );

  // 控制流量和有效期开关的状态
  const [unlimitedTraffic, setUnlimitedTraffic] = useState(true);
  const [permanentValid, setPermanentValid] = useState(true);

  useEffect(() => {
    if (isEdit) {
      api.listSubs().then((response) => {
        const list = response.data || [];
        const target = list.find((x: any) => x.id === params.id);
        if (!target) {
          message.error("未找到订阅");
          navigate("/");
          return;
        }

        // 设置流量限制状态
        const hasTrafficLimit = target.totalTrafficBytes !== null;
        setUnlimitedTraffic(!hasTrafficLimit);

        // 设置有效期状态（检查是否为永久有效）
        const isPermanent = !target.expireAt;
        const startTime = target.startAt ? dayjs(target.startAt) : null;
        const expireTime = target.expireAt ? dayjs(target.expireAt) : null;
        setPermanentValid(isPermanent || !expireTime);

        form.setFieldsValue({
          name: target.name,
          enabled: target.enabled,
          totalTrafficBytes: hasTrafficLimit
            ? target.totalTrafficBytes
            : undefined,
          period: startTime && expireTime ? [startTime, expireTime] : undefined
        });
        setYaml(target.yamlConfig);
      });
    }
  }, []);

  async function onFinish(values: any) {
    setLoading(true);
    try {
      let startAt, expireAt;

      if (permanentValid) {
        // 永久有效：开始时间为当前时间，结束时间为100年后
        startAt = "";
        expireAt = "";
      } else {
        [startAt, expireAt] = values.period;
      }

      const payload = {
        name: values.name,
        enabled: values.enabled ?? true,
        totalTrafficBytes: unlimitedTraffic
          ? null
          : (values.totalTrafficBytes ?? null),
        startAt: startAt?.toISOString?.() || "",
        expireAt: expireAt?.toISOString?.() || "",
        yamlConfig: yaml
      };
      if (isEdit) {
        await api.updateSub(params.id as string, payload);
        message.success("已保存");
      } else {
        await api.createSub(payload as any);
        message.success("已创建");
      }
      navigate("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w px-6 py-4">
      <Card title={isEdit ? "编辑订阅" : "创建订阅"} className="shadow-lg">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            enabled: true,
            name: "",
            period: [dayjs(), dayjs().add(30, "day")]
          }}
        >
          {/* 基本信息 */}
          <Card
            size="small"
            title="基本信息"
            className="mb-6"
            styles={{ body: { background: "#f7f7f7" } }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="节点名称"
                  name="name"
                  rules={[{ required: true, message: "请输入节点名称" }]}
                >
                  <Input
                    placeholder="例如：自用节点A"
                    size="large"
                    maxLength={30}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="是否启用"
                  name="enabled"
                  valuePropName="checked"
                  className="mb-0"
                >
                  <Switch
                    size="default"
                    checkedChildren="启用"
                    unCheckedChildren="禁用"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 有效期设置 */}
          <Card
            size="small"
            title="有效期设置"
            className="mb-6"
            styles={{ body: { background: "#f7f7f7" } }}
          >
            <Form.Item label="有效期" className="mb-4">
              <div className="flex items-center space-x-4">
                <Switch
                  checked={permanentValid}
                  onChange={setPermanentValid}
                  checkedChildren="永久有效"
                  unCheckedChildren="设置期限"
                  size="default"
                />
                <Typography.Text type="secondary">
                  {permanentValid ? "永久有效，无过期时间" : "设置具体的有效期"}
                </Typography.Text>
              </div>
            </Form.Item>

            {!permanentValid && (
              <Form.Item
                label="有效期范围"
                name="period"
                rules={[{ required: true, message: "请选择有效期" }]}
              >
                <DatePicker.RangePicker
                  showTime
                  size="large"
                  style={{ width: "100%" }}
                  placeholder={["开始时间", "结束时间"]}
                />
              </Form.Item>
            )}
          </Card>

          {/* 流量设置 */}
          <Card
            size="small"
            title="流量设置"
            className="mb-6"
            styles={{ body: { background: "#f7f7f7" } }}
          >
            <Form.Item label="流量限制" className="mb-4">
              <div className="flex items-center space-x-4">
                <Switch
                  checked={unlimitedTraffic}
                  onChange={setUnlimitedTraffic}
                  checkedChildren="无限流量"
                  unCheckedChildren="限制流量"
                  size="default"
                />
                <Typography.Text type="secondary">
                  {unlimitedTraffic ? "不限制流量使用" : "设置流量上限"}
                </Typography.Text>
              </div>
            </Form.Item>

            {!unlimitedTraffic && (
              <Form.Item
                label="总流量（字节）"
                name="totalTrafficBytes"
                rules={[{ required: true, message: "请输入流量限制" }]}
                tooltip="1GB = 1073741824 字节"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="例如：107374182400 表示100GB"
                  min={1}
                  size="large"
                  addonAfter="字节"
                />
              </Form.Item>
            )}
          </Card>

          {/* 节点配置 */}
          <Card size="small" title="节点配置" className="mb-6">
            <Form.Item
              label="Clash 配置文件（YAML）"
              required
              tooltip={
                <>
                  请粘贴完整的 Clash 配置文件内容。
                  <a
                    className="text-blue-500"
                    href="https://wiki.metacubex.one/config/"
                    target="_blank"
                  >
                    配置文档
                  </a>
                </>
              }
            >
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <Editor
                  height="400px"
                  theme="vs-dark"
                  defaultLanguage="yaml"
                  value={yaml}
                  onChange={(v) => setYaml(v || "")}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                    padding: { top: 20, bottom: 20 }
                  }}
                />
              </div>
            </Form.Item>
          </Card>

          {/* 操作按钮 */}
          {/* <Card className="fixed bottom-0 left-0 right-0 rounded-none"> */}
          <div className="flex justify-end space-x-4">
            <Button size="large" onClick={() => navigate("/")}>
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
            >
              {isEdit ? "保存更改" : "创建订阅"}
            </Button>
          </div>
          {/* </Card> */}
        </Form>
      </Card>
    </div>
  );
}
