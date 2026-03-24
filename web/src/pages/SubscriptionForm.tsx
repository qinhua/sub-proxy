import { useEffect, useState } from "react";
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
  Radio,
  Select,
  Divider,
  Popconfirm
} from "antd";
import { ArrowLeftOutlined, PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import dayjs from "dayjs";
import { api } from "../api";
import { v4 as uuidv4 } from "uuid";

const DEFAULT_BASE_CONFIG = `# ================= 基础设置 =================
port: 7890
socks-port: 7891
redir-port: 7892
tproxy-port: 7893
bind-address: "*"
allow-lan: true
mode: rule
log-level: info
external-controller: 0.0.0.0:9090
dns:
  enable: true
  ipv6: false
  use-hosts: true
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
    - 114.114.114.114
  nameserver:
    - 223.5.5.5
    - 119.29.29.29
    - 114.114.114.114
  fallback:
    - https://doh.dns.sb/dns-query
    - https://dns.cloudflare.com/dns-query
    - https://dns.twnic.tw/dns-query
  fallback-filter:
    geoip: true
    geoip-code: CN
    ipcidr:
      - 240.0.0.0/4
      - 127.0.0.1/32
      - 0.0.0.0/32
    domain:
      - geosite:geolocation-!cn

# ================= 代理组基础设置 =================
proxy-groups:
  - name: "🌍 国外通用"
    type: select
    proxies:
      - "🚀 自动优选加速"
      - DIRECT
  - name: "🎯 国内直连"
    type: select
    proxies:
      - DIRECT
      - "🚀 自动优选加速"`;

const DEFAULT_RULES = `# 1. 需要固定美国 IP 的场景
- DOMAIN-SUFFIX,openai.com,🇺🇸 美国固定 IP (链式)
- DOMAIN-KEYWORD,chatgpt,🇺🇸 美国固定 IP (链式)
# 2. 国内流量直连
- GEOIP,CN,🎯 国内直连
# 3. 其余国外流量走自动优选 (速度最快)
- MATCH,🌍 国外流量自动选`;

export function SubscriptionForm() {
  const navigate = useNavigate();
  const params = useParams();
  const isEdit = Boolean(params.id);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [yaml, setYaml] = useState(
    "# 在此粘贴Clash配置\nproxies: []\nproxy-groups: []\nrules: []"
  );
  const [configMode, setConfigMode] = useState<'yaml' | 'visual'>('yaml');

  // Visual Config states
  const [baseConfig, setBaseConfig] = useState(DEFAULT_BASE_CONFIG);
  const [rulesConfig, setRulesConfig] = useState(DEFAULT_RULES);

  // 控制流量和有效期开关的状态
  const [unlimitedTraffic, setUnlimitedTraffic] = useState(true);
  const [permanentValid, setPermanentValid] = useState(true);

  useEffect(() => {
    if (isEdit) {
      api.listSubs().then(response => {
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
          description: target.description,
          enabled: target.enabled,
          totalTrafficBytes: hasTrafficLimit
            ? target.totalTrafficBytes
            : undefined,
          period: startTime && expireTime ? [startTime, expireTime] : undefined,
          proxyProviders: target.visualConfig?.proxyProviders || [],
          chainProxies: target.visualConfig?.chainProxies || []
        });
        setConfigMode(target.configMode || 'yaml');
        setYaml(target.yamlConfig || "");
        if (target.visualConfig) {
          if (target.visualConfig.baseConfig) setBaseConfig(target.visualConfig.baseConfig);
          if (target.visualConfig.rules) setRulesConfig(target.visualConfig.rules);
        }
      });
    } else {
      // Default lists for create
      form.setFieldsValue({
        proxyProviders: [],
        chainProxies: []
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
        description: values.description,
        enabled: values.enabled ?? true,
        totalTrafficBytes: unlimitedTraffic
          ? null
          : (values.totalTrafficBytes ?? null),
        startAt: startAt?.toISOString?.() || "",
        expireAt: expireAt?.toISOString?.() || "",
        yamlConfig: yaml,
        configMode: configMode,
        visualConfig: {
          baseConfig: baseConfig,
          rules: rulesConfig,
          proxyProviders: values.proxyProviders || [],
          chainProxies: values.chainProxies || []
        }
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
      <Card
        title={
          <Space align="center" size={5}>
            <Button
              icon={<ArrowLeftOutlined />}
              type="text"
              size="large"
              onClick={() => navigate("/")}
            />
            <Typography.Title level={5} style={{ margin: 0 }}>
              {isEdit ? "编辑订阅" : "创建订阅"}
            </Typography.Title>
          </Space>
        }
        className="shadow-lg"
      >
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
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="节点描述"
                  name="description"
                  tooltip="将作为订阅头部信息的描述 (info.description)"
                >
                  <Input.TextArea
                    placeholder="例如：这是用于日常浏览和海外社媒的优化节点"
                    rows={3}
                    maxLength={200}
                    showCount
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

          {/* 配置模式切换 */}
          <Card
            size="small"
            title="配置模式"
            className="mb-6"
            styles={{ body: { background: "#f7f7f7" } }}
          >
            <Radio.Group
              value={configMode}
              onChange={e => setConfigMode(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="yaml">直填 YAML</Radio.Button>
              <Radio.Button value="visual">可视化配置</Radio.Button>
            </Radio.Group>
            <Typography.Text type="secondary" className="ml-4">
              {configMode === "yaml"
                ? "直接粘贴完整的 Clash 配置文件"
                : "分模块配置节点、基础设置和规则，系统将自动生成最终配置"}
            </Typography.Text>
          </Card>

          {configMode === "yaml" ? (
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
                    onChange={v => setYaml(v || "")}
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
          ) : (
            <>
              {/* 可视化配置模块 */}
              <Card size="small" title="基础配置 (Base Settings)" className="mb-6">
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <Editor
                    height="200px"
                    theme="vs-dark"
                    defaultLanguage="yaml"
                    value={baseConfig}
                    onChange={v => setBaseConfig(v || "")}
                    options={{ minimap: { enabled: false } }}
                  />
                </div>
              </Card>

              <Card size="small" title="机场节点订阅 (Proxy Providers)" className="mb-6">
                <Form.List name="proxyProviders">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field, index) => (
                        <Card size="small" className="mb-4" key={field.key}>
                          <div className="flex justify-between items-center mb-2">
                            <Typography.Text strong>节点配置 {index + 1}</Typography.Text>
                            <Button danger type="text" icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>
                              移除
                            </Button>
                          </div>
                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item
                                {...field}
                                name={[field.name, 'name']}
                                label="名称"
                                rules={[{ required: true, message: '请输入名称' }]}
                              >
                                <Input placeholder="如：XX机场" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                {...field}
                                name={[field.name, 'type']}
                                label="来源类型"
                                rules={[{ required: true }]}
                                initialValue="url"
                              >
                                <Select>
                                  <Select.Option value="url">订阅链接</Select.Option>
                                  <Select.Option value="content">直接填入节点(YAML)</Select.Option>
                                </Select>
                              </Form.Item>
                            </Col>
                          </Row>

                          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.proxyProviders?.[field.name]?.type !== curr.proxyProviders?.[field.name]?.type}>
                            {() => {
                              const type = form.getFieldValue(['proxyProviders', field.name, 'type']);
                              if (type === 'url') {
                                return (
                                  <>
                                    <Row gutter={16}>
                                      <Col span={16}>
                                        <Form.Item
                                          {...field}
                                          name={[field.name, 'url']}
                                          label="订阅链接"
                                          rules={[{ required: true, message: '请输入订阅链接' }]}
                                        >
                                          <Input placeholder="http://" />
                                        </Form.Item>
                                      </Col>
                                      <Col span={8}>
                                        <Form.Item
                                          {...field}
                                          name={[field.name, 'updateInterval']}
                                          label="更新间隔(小时)"
                                          initialValue={24}
                                        >
                                          <InputNumber min={1} className="w-full" />
                                        </Form.Item>
                                      </Col>
                                    </Row>
                                    {isEdit && (
                                      <div className="mb-4">
                                        <Button
                                          size="small"
                                          onClick={async () => {
                                            try {
                                              await onFinish(form.getFieldsValue());
                                              await api.fetchNodes(params.id as string);
                                              message.success("拉取成功");
                                            } catch (e: any) {
                                              message.error(e.response?.data?.message || "拉取失败");
                                            }
                                          }}
                                        >
                                          保存并拉取节点
                                        </Button>
                                        <Typography.Text type="secondary" className="ml-2 text-xs">
                                          (将自动保存当前配置并拉取节点)
                                        </Typography.Text>
                                      </div>
                                    )}
                                  </>
                                );
                              } else {
                                return (
                                  <Form.Item
                                    {...field}
                                    name={[field.name, 'content']}
                                    label="节点列表 (YAML)"
                                    rules={[{ required: true, message: '请输入节点内容' }]}
                                  >
                                    <Input.TextArea rows={6} placeholder={`- name: "Node 1"\n  type: ss\n  server: ...`} />
                                  </Form.Item>
                                );
                              }
                            }}
                          </Form.Item>
                        </Card>
                      ))}
                      <Button type="dashed" onClick={() => add({ id: uuidv4(), type: 'url' })} block icon={<PlusOutlined />}>
                        添加机场订阅
                      </Button>
                    </>
                  )}
                </Form.List>
              </Card>

              <Card size="small" title="链式代理 (Chain Proxies - Relay)" className="mb-6">
                <Typography.Paragraph type="secondary">
                  第一跳将自动使用上方所有机场节点中延迟最低的节点。您只需要配置第二跳（如静态住宅IP）即可。
                </Typography.Paragraph>
                <Form.List name="chainProxies">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field, index) => (
                        <Card size="small" className="mb-4" key={field.key}>
                          <div className="flex justify-between items-center mb-2">
                            <Typography.Text strong>链式代理节点 {index + 1}</Typography.Text>
                            <Button danger type="text" icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>
                              移除
                            </Button>
                          </div>
                          <Form.Item
                            {...field}
                            name={[field.name, 'name']}
                            label="代理组名称 (Proxy Group Name)"
                            rules={[{ required: true, message: '请输入代理组名称' }]}
                            tooltip="将在规则中引用的名称，如：🐳 国外社媒。建议与下方节点配置中的 name 字段不同。"
                          >
                            <Input placeholder="🐳 国外社媒" />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            name={[field.name, 'secondHopConfig']}
                            label="第二跳节点配置 (YAML)"
                            rules={[{ required: true, message: '请输入节点配置' }]}
                            tooltip="只需填写单个节点的YAML配置，不需要写数组短横线。注意：必须包含 'name:' 字段，用于在代理组中显示。"
                          >
                            <Input.TextArea rows={6} placeholder={`name: "🇺🇸 洛杉矶住宅 IP"\ntype: socks5\nserver: 1.2.3.4\nport: 1080...`} />
                          </Form.Item>
                        </Card>
                      ))}
                      <Button type="dashed" onClick={() => add({ id: uuidv4() })} block icon={<PlusOutlined />}>
                        添加链式代理
                      </Button>
                    </>
                  )}
                </Form.List>
              </Card>

              <Card size="small" title="分流规则 (Rules)" className="mb-6">
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <Editor
                    height="250px"
                    theme="vs-dark"
                    defaultLanguage="yaml"
                    value={rulesConfig}
                    onChange={v => setRulesConfig(v || "")}
                    options={{ minimap: { enabled: false } }}
                  />
                </div>
              </Card>
            </>
          )}

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
