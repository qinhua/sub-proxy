import { useEffect, useState } from "react";
import {
  App as AntdApp,
  Form,
  Input,
  DatePicker,
  Switch,
  InputNumber,
  Button,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Radio,
  Select,
  Tag
} from "antd";
import {
  PlusOutlined,
  ArrowLeftOutlined,
  MinusCircleOutlined
} from "@ant-design/icons";
import {
  DEFAULT_YAML_CONFIG,
  DEFAULT_BASE_CONFIG,
  DEFAULT_PROXY_GROUPS_CONFIG,
  DEFAULT_RULES,
  RULE_PRESETS
} from "../constants";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Subscription } from "../types";
import Editor from "@monaco-editor/react";
import { v4 as uuidv4 } from "uuid";
import { api } from "../api";
import dayjs from "dayjs";

const BYTES_PER_GB = 1024 * 1024 * 1024;
const PROXY_GROUPS_MARKER = "# ================= 代理组配置 =================";

const bytesToGb = (bytes: number) => Number((bytes / BYTES_PER_GB).toFixed(2));
const gbToBytes = (gb: number) => Math.round(gb * BYTES_PER_GB);

const splitLegacyBaseConfig = (rawConfig?: string) => {
  const config = (rawConfig || "").trim();
  if (!config) {
    return {
      baseConfig: DEFAULT_BASE_CONFIG,
      proxyGroupsConfig: DEFAULT_PROXY_GROUPS_CONFIG
    };
  }

  const markerIndex = config.indexOf(PROXY_GROUPS_MARKER);
  if (markerIndex >= 0) {
    const basePart = config.slice(0, markerIndex).trim();
    const proxyPart = config.slice(markerIndex).trim();
    return {
      baseConfig: basePart || DEFAULT_BASE_CONFIG,
      proxyGroupsConfig: proxyPart || DEFAULT_PROXY_GROUPS_CONFIG
    };
  }

  const proxyGroupsMatch = config.match(/^proxy-groups\s*:/m);
  if (proxyGroupsMatch?.index !== undefined) {
    const basePart = config.slice(0, proxyGroupsMatch.index).trim();
    const proxyPart = config.slice(proxyGroupsMatch.index).trim();
    return {
      baseConfig: basePart || DEFAULT_BASE_CONFIG,
      proxyGroupsConfig: proxyPart || DEFAULT_PROXY_GROUPS_CONFIG
    };
  }

  return {
    baseConfig: config,
    proxyGroupsConfig: DEFAULT_PROXY_GROUPS_CONFIG
  };
};

export function SubscriptionForm() {
  const { message, modal } = AntdApp.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const isEdit = Boolean(params.id);
  const duplicateFrom = !isEdit
    ? ((location.state as { duplicateFrom?: Subscription } | null)
        ?.duplicateFrom ?? null)
    : null;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [yaml, setYaml] = useState(DEFAULT_YAML_CONFIG);
  const [configMode, setConfigMode] = useState<"yaml" | "visual">("yaml");
  const [selectedRulePreset, setSelectedRulePreset] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Visual Config states
  const [baseConfig, setBaseConfig] = useState(DEFAULT_BASE_CONFIG);
  const [proxyGroupsConfig, setProxyGroupsConfig] = useState(
    DEFAULT_PROXY_GROUPS_CONFIG
  );
  const [rulesConfig, setRulesConfig] = useState(DEFAULT_RULES);
  const ruleProvidersWatch = Form.useWatch("ruleProviders", form) || [];

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
          totalTrafficGb: hasTrafficLimit
            ? bytesToGb(target.totalTrafficBytes ?? 0)
            : undefined,
          period: startTime && expireTime ? [startTime, expireTime] : undefined,
          proxyProviders: target.visualConfig?.proxyProviders || [],
          chainProxies: target.visualConfig?.chainProxies || [],
          ruleProviders: target.visualConfig?.ruleProviders || []
        });
        setConfigMode(target.configMode || "yaml");
        setYaml(target.yamlConfig || "");
        if (target.visualConfig) {
          if (target.visualConfig.proxyGroupsConfig !== undefined) {
            setBaseConfig(
              target.visualConfig.baseConfig || DEFAULT_BASE_CONFIG
            );
            setProxyGroupsConfig(
              target.visualConfig.proxyGroupsConfig ||
                DEFAULT_PROXY_GROUPS_CONFIG
            );
          } else {
            const splitConfig = splitLegacyBaseConfig(
              target.visualConfig.baseConfig
            );
            setBaseConfig(splitConfig.baseConfig);
            setProxyGroupsConfig(splitConfig.proxyGroupsConfig);
          }
          if (target.visualConfig.rules)
            setRulesConfig(target.visualConfig.rules);
        }
      });
    } else if (duplicateFrom) {
      const hasTrafficLimit = duplicateFrom.totalTrafficBytes !== null;
      setUnlimitedTraffic(!hasTrafficLimit);

      const isPermanent = !duplicateFrom.expireAt;
      const startTime = duplicateFrom.startAt
        ? dayjs(duplicateFrom.startAt)
        : null;
      const expireTime = duplicateFrom.expireAt
        ? dayjs(duplicateFrom.expireAt)
        : null;
      setPermanentValid(isPermanent || !expireTime);

      form.setFieldsValue({
        name: `${duplicateFrom.name}-副本`,
        description: duplicateFrom.description,
        enabled: duplicateFrom.enabled,
        totalTrafficGb: hasTrafficLimit
          ? bytesToGb(duplicateFrom.totalTrafficBytes ?? 0)
          : undefined,
        period:
          startTime && expireTime
            ? [startTime, expireTime]
            : [dayjs(), dayjs().add(30, "day")],
        proxyProviders: duplicateFrom.visualConfig?.proxyProviders || [],
        chainProxies: duplicateFrom.visualConfig?.chainProxies || [],
        ruleProviders: duplicateFrom.visualConfig?.ruleProviders || []
      });
      setConfigMode(duplicateFrom.configMode || "yaml");
      setYaml(duplicateFrom.yamlConfig || "");
      if (duplicateFrom.visualConfig?.proxyGroupsConfig !== undefined) {
        setBaseConfig(
          duplicateFrom.visualConfig.baseConfig || DEFAULT_BASE_CONFIG
        );
        setProxyGroupsConfig(
          duplicateFrom.visualConfig.proxyGroupsConfig ||
            DEFAULT_PROXY_GROUPS_CONFIG
        );
      } else {
        const splitConfig = splitLegacyBaseConfig(
          duplicateFrom.visualConfig?.baseConfig
        );
        setBaseConfig(splitConfig.baseConfig);
        setProxyGroupsConfig(splitConfig.proxyGroupsConfig);
      }
      if (duplicateFrom.visualConfig?.rules)
        setRulesConfig(duplicateFrom.visualConfig.rules);
    } else {
      form.setFieldsValue({
        proxyProviders: [],
        chainProxies: [],
        ruleProviders: []
      });
    }
  }, []);

  const handleAppendToRulesConfig = (
    rulesetName: string,
    targetGroup = "🌏 国外通用"
  ) => {
    const name = (rulesetName || "").trim();
    if (!name) {
      message.warning("请先填写规则集名称");
      return;
    }
    const line = `- RULE-SET,${name},${targetGroup}`;
    setRulesConfig(prev => {
      const current = prev || "";
      const exists = current.split("\n").some(l => l.trim() === line.trim());
      if (exists) {
        message.info("该规则引用已存在");
        return current;
      }
      if (!current.trim()) {
        return `${line}\n`;
      }
      message.success("已在分流规则中引用该规则集");
      return `${line}\n${current}`;
    });
  };

  const handleRemoveFromRulesConfig = (rulesetName: string) => {
    const name = (rulesetName || "").trim();
    if (!name) {
      return;
    }
    setRulesConfig(prev => {
      const current = prev || "";
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const ruleSetLinePattern = new RegExp(
        `^\\s*-\\s*RULE-SET\\s*,\\s*${escapedName}\\s*,`,
        "i"
      );
      return current
        .split("\n")
        .filter(line => !ruleSetLinePattern.test(line))
        .join("\n");
    });
  };

  const buildPayload = (values: any) => {
    let startAt;
    let expireAt;
    if (permanentValid) {
      startAt = "";
      expireAt = "";
    } else {
      [startAt, expireAt] = values.period || [];
    }

    return {
      name: values.name,
      description: values.description,
      enabled: values.enabled ?? true,
      totalTrafficBytes: unlimitedTraffic
        ? null
        : gbToBytes(values.totalTrafficGb ?? 0),
      startAt: startAt?.toISOString?.() || "",
      expireAt: expireAt?.toISOString?.() || "",
      yamlConfig: yaml,
      configMode: configMode,
      visualConfig: {
        baseConfig: baseConfig,
        proxyGroupsConfig: proxyGroupsConfig,
        rules: rulesConfig,
        proxyProviders: values.proxyProviders || [],
        ruleProviders: values.ruleProviders || [],
        chainProxies: values.chainProxies || []
      }
    };
  };

  const hasUrlProxyProvider = (values: any) => {
    return (
      configMode === "visual" &&
      (values.proxyProviders || []).some(
        (provider: any) => provider?.type === "url" && provider?.url?.trim()
      )
    );
  };

  const submitSubscription = async (
    values: any,
    options: { navigateAfterSave?: boolean; forceFetchNodes?: boolean } = {}
  ) => {
    const { navigateAfterSave = true, forceFetchNodes = false } = options;
    setLoading(true);
    try {
      const payload = buildPayload(values);
      let savedId = params.id as string;

      if (isEdit) {
        await api.updateSub(savedId, payload);
      } else {
        const created = await api.createSub(payload as any);
        savedId = created.data?.id || "";
      }

      const shouldFetchNodes = forceFetchNodes || hasUrlProxyProvider(values);
      if (shouldFetchNodes) {
        if (!savedId) {
          throw new Error("未获取到订阅ID，无法拉取节点");
        }
        const fetchResult = await api.fetchNodes(savedId);
        message.success(
          fetchResult.message ||
            (isEdit ? "已保存并自动拉取节点" : "已创建并自动拉取节点")
        );
      } else {
        message.success(isEdit ? "已保存" : "已创建");
      }

      if (navigateAfterSave) {
        navigate("/");
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || e.message || "保存失败");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    await submitSubscription(values);
  };

  return (
    <div className="max-w px-6 py-4">
      <Card
        id="subscription-form"
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
                label="总流量（单位：GB）"
                name="totalTrafficGb"
                rules={[{ required: true, message: "请输入流量限制" }]}
                tooltip="1GB = 1073741824 字节"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="例如：100"
                  min={0}
                  step={1}
                  size="large"
                  addonAfter="GB"
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
            <Card size="small" title="YAML 配置" className="mb-6">
              <Form.Item
                label="Clash 配置文件（YAML）"
                required
                tooltip={
                  <>
                    请粘贴完整的 yaml 格式配置文件。
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
              <Card
                size="small"
                title="基础配置 (Base Settings)"
                className="mb-6"
              >
                <Typography.Paragraph type="secondary">
                  基础的头部配置，包含 mode、dns 等，可根据实际情况调整。
                </Typography.Paragraph>
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

              <Card
                size="small"
                title="代理组配置 (Proxy Groups)"
                className="mb-6"
              >
                <Typography.Paragraph type="secondary">
                  需根据配置的机场节点、链式代理等进行调整，配置好之后多调试几次。
                </Typography.Paragraph>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <Editor
                    height="220px"
                    theme="vs-dark"
                    defaultLanguage="yaml"
                    value={proxyGroupsConfig}
                    onChange={v => setProxyGroupsConfig(v || "")}
                    options={{ minimap: { enabled: false } }}
                  />
                </div>
              </Card>

              <Card
                size="small"
                title="机场节点 (Proxy Providers)"
                className="mb-6"
              >
                <Typography.Paragraph type="secondary">
                  可以配置多个机场节点，每个节点都有自己的名称、来源类型、URL
                  等信息。
                </Typography.Paragraph>
                <Form.List name="proxyProviders">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field, index) => {
                        const { key: _k, ...restField } = field;
                        return (
                          <Card size="small" className="mb-4" key={field.key}>
                            <div className="flex justify-between items-center mb-2">
                              <Typography.Text strong>
                                节点配置 {index + 1}
                              </Typography.Text>
                              <Button
                                size="small"
                                danger
                                type="text"
                                icon={<MinusCircleOutlined />}
                                onClick={() => remove(field.name)}
                              >
                                移除
                              </Button>
                            </div>
                            <Row gutter={16}>
                              <Col span={12}>
                                <Form.Item
                                  {...restField}
                                  name={[field.name, "name"]}
                                  label="名称"
                                  rules={[
                                    { required: true, message: "请输入名称" }
                                  ]}
                                >
                                  <Input placeholder="如：XX机场" />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item
                                  {...restField}
                                  name={[field.name, "type"]}
                                  label="来源类型"
                                  rules={[{ required: true }]}
                                  initialValue="url"
                                >
                                  <Select>
                                    <Select.Option value="url">
                                      订阅链接
                                    </Select.Option>
                                    <Select.Option value="content">
                                      直接填入节点(YAML)
                                    </Select.Option>
                                  </Select>
                                </Form.Item>
                              </Col>
                            </Row>

                            <Form.Item
                              noStyle
                              shouldUpdate={(prev, curr) =>
                                prev.proxyProviders?.[field.name]?.type !==
                                curr.proxyProviders?.[field.name]?.type
                              }
                            >
                              {() => {
                                const type = form.getFieldValue([
                                  "proxyProviders",
                                  field.name,
                                  "type"
                                ]);
                                if (type === "url") {
                                  return (
                                    <>
                                      <Row gutter={16}>
                                        <Col span={16}>
                                          <Form.Item
                                            {...restField}
                                            name={[field.name, "url"]}
                                            label="订阅链接"
                                            rules={[
                                              {
                                                required: true,
                                                message: "请输入订阅链接"
                                              }
                                            ]}
                                          >
                                            <Input placeholder="http://" />
                                          </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                          <Form.Item
                                            {...restField}
                                            name={[
                                              field.name,
                                              "updateInterval"
                                            ]}
                                            label="更新间隔(小时)"
                                            initialValue={24}
                                          >
                                            <InputNumber
                                              min={1}
                                              className="w-full"
                                            />
                                          </Form.Item>
                                        </Col>
                                      </Row>
                                      {isEdit && (
                                        <div className="mb-4">
                                          <Button
                                            size="small"
                                            type="primary"
                                            onClick={async () => {
                                              try {
                                                const values =
                                                  await form.validateFields();
                                                await submitSubscription(
                                                  values,
                                                  {
                                                    navigateAfterSave: false,
                                                    forceFetchNodes: true
                                                  }
                                                );
                                              } catch {}
                                            }}
                                          >
                                            保存并拉取节点
                                          </Button>
                                          <Typography.Text
                                            type="secondary"
                                            className="ml-2 text-xs"
                                          >
                                            (将自动保存当前配置并拉取节点)
                                          </Typography.Text>
                                        </div>
                                      )}
                                    </>
                                  );
                                } else {
                                  return (
                                    <Form.Item
                                      {...restField}
                                      name={[field.name, "content"]}
                                      label="节点列表 (YAML)"
                                      rules={[
                                        {
                                          required: true,
                                          message: "请输入节点内容"
                                        }
                                      ]}
                                    >
                                      <Input.TextArea
                                        rows={6}
                                        placeholder={`- name: "Node 1"\n  type: ss\n  server: ...`}
                                      />
                                    </Form.Item>
                                  );
                                }
                              }}
                            </Form.Item>
                          </Card>
                        );
                      })}
                      <Button
                        type="dashed"
                        onClick={() => add({ id: uuidv4(), type: "url" })}
                        block
                        icon={<PlusOutlined />}
                      >
                        添加
                      </Button>
                    </>
                  )}
                </Form.List>
              </Card>

              <Card
                size="small"
                title="链式代理 (Chain Proxies - Relay)"
                className="mb-6"
              >
                <Typography.Paragraph type="secondary">
                  对于需要固定 IP 出口的场景（如海外社媒运营、访问各种 AI
                  服务），需要通过配置链式代理来实现，具体节点请自行购买。
                  <br />
                  第一跳将自动使用上方所有机场节点中延迟最低的节点。您只需要配置第二跳链式节点（如：洛杉矶静态住宅IP）即可。
                </Typography.Paragraph>
                <Form.List name="chainProxies">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field, index) => {
                        const { key: _k, ...restField } = field;
                        return (
                          <Card size="small" className="mb-4" key={field.key}>
                            <div className="flex justify-between items-center mb-2">
                              <Typography.Text strong>
                                链式代理节点 {index + 1}
                              </Typography.Text>
                              <Button
                                size="small"
                                danger
                                type="text"
                                icon={<MinusCircleOutlined />}
                                onClick={() => remove(field.name)}
                              >
                                移除
                              </Button>
                            </div>
                            <Form.Item
                              {...restField}
                              name={[field.name, "name"]}
                              label="代理组名称 (Proxy Group Name)"
                              rules={[
                                { required: true, message: "请输入代理组名称" }
                              ]}
                              tooltip="将在规则中引用的名称，如：🏠 美国住宅。建议与下方节点配置中的 name 字段不同。"
                            >
                              <Input placeholder="如：🏠 美国住宅" />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[field.name, "secondHopConfig"]}
                              label="第二跳节点配置 (YAML)"
                              rules={[
                                { required: true, message: "请输入节点配置" }
                              ]}
                              tooltip="只需填写单个节点的YAML配置，不需要写数组短横线。注意：必须包含 'name:' 字段，用于在代理组中显示。"
                            >
                              <Input.TextArea
                                rows={6}
                                placeholder={`格式如下：\nname: "🇺🇸 洛杉矶住宅 IP"\ntype: socks5\nserver: 1.2.3.4\nport: 1080...`}
                              />
                            </Form.Item>
                          </Card>
                        );
                      })}
                      <Button
                        type="dashed"
                        onClick={() => add({ id: uuidv4() })}
                        block
                        icon={<PlusOutlined />}
                      >
                        添加
                      </Button>
                    </>
                  )}
                </Form.List>
              </Card>

              <Card
                size="small"
                title="第三方分流规则集 (Rule Providers)"
                className="mb-6"
              >
                <Typography.Paragraph type="secondary">
                  可引入成熟的第三方分流规则集（RULE-SET），如 ACL4SSR
                  等，优先级：自定义分流规则 &gt; 第三方规则集 &gt;
                  默认分类规则。
                  <br />
                  添加后可在下方 “分流规则” 编辑器中使用：
                  <br />- RULE-SET,[规则名称],[目标策略组]。
                </Typography.Paragraph>
                <Row gutter={12} style={{ marginBottom: 12 }}>
                  <Col span={12}>
                    <Select
                      value={selectedRulePreset}
                      onChange={setSelectedRulePreset}
                      className="w-full"
                      placeholder="选择预设规则集"
                      options={RULE_PRESETS.map(p => ({
                        value: p.name,
                        label: p.name
                      }))}
                    />
                  </Col>
                  <Col span={12}>
                    <Space>
                      <Button
                        type="primary"
                        onClick={() => {
                          const preset = RULE_PRESETS.find(
                            p => p.name === selectedRulePreset
                          );
                          if (!preset) return;
                          const list =
                            form.getFieldValue("ruleProviders") || [];
                          form.setFieldsValue({
                            ruleProviders: [
                              ...list,
                              {
                                id: uuidv4(),
                                name: preset.name,
                                url: preset.url,
                                isPreset: true,
                                behavior: preset.behavior,
                                interval: preset.interval
                              }
                            ]
                          });
                          // message.success("已添加预设规则集");
                        }}
                        disabled={!selectedRulePreset}
                        icon={<PlusOutlined />}
                      >
                        添加预设
                      </Button>
                    </Space>
                  </Col>
                </Row>
                <Form.List name="ruleProviders">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field, index) => {
                        const { key: _k, ...restField } = field;
                        return (
                          <Card size="small" className="mb-4" key={field.key}>
                            <div className="flex justify-between items-center mb-2">
                              <Space style={{ gap: 4 }}>
                                <Typography.Text strong>
                                  规则集 {index + 1}
                                </Typography.Text>
                                {form.getFieldValue("ruleProviders")[index]
                                  ?.isPreset ? (
                                  <Tag color="green">预设</Tag>
                                ) : null}
                              </Space>

                              <Space style={{ gap: 4 }}>
                                <Button
                                  type="primary"
                                  size="small"
                                  onClick={() =>
                                    handleAppendToRulesConfig(
                                      ruleProvidersWatch?.[index]?.name
                                    )
                                  }
                                  disabled={!ruleProvidersWatch?.[index]?.name}
                                >
                                  引用到分流规则
                                </Button>
                                <Button
                                  size="small"
                                  danger
                                  type="text"
                                  icon={<MinusCircleOutlined />}
                                  onClick={() => {
                                    const ruleSetName =
                                      ruleProvidersWatch?.[index]?.name;
                                    remove(field.name);
                                    handleRemoveFromRulesConfig(ruleSetName);
                                  }}
                                >
                                  移除
                                </Button>
                              </Space>
                            </div>
                            <Row gutter={16}>
                              <Col span={8}>
                                <Form.Item
                                  {...restField}
                                  name={[field.name, "name"]}
                                  label="名称"
                                  rules={[
                                    { required: true, message: "请输入名称" }
                                  ]}
                                >
                                  <Input placeholder="如：ACL4SSR_Proxy" />
                                </Form.Item>
                              </Col>
                              <Col span={10}>
                                <Form.Item
                                  {...restField}
                                  name={[field.name, "url"]}
                                  label="订阅地址"
                                  rules={[
                                    {
                                      required: true,
                                      message: "请输入规则集地址"
                                    }
                                  ]}
                                >
                                  <Input placeholder="https://..." />
                                </Form.Item>
                              </Col>
                              <Col span={6}>
                                <Form.Item
                                  {...restField}
                                  name={[field.name, "behavior"]}
                                  label="类型"
                                  initialValue="domain"
                                >
                                  <Select>
                                    <Select.Option value="domain">
                                      domain
                                    </Select.Option>
                                    <Select.Option value="classical">
                                      classical
                                    </Select.Option>
                                    <Select.Option value="ipcidr">
                                      ipcidr
                                    </Select.Option>
                                  </Select>
                                </Form.Item>
                              </Col>
                            </Row>
                            <Row gutter={16}>
                              <Col span={8}>
                                <Form.Item
                                  {...restField}
                                  name={[field.name, "interval"]}
                                  label="更新间隔(秒)"
                                  initialValue={86400}
                                >
                                  <InputNumber min={3600} className="w-full" />
                                </Form.Item>
                              </Col>
                            </Row>
                          </Card>
                        );
                      })}
                      <Button
                        type="dashed"
                        onClick={() =>
                          add({ id: uuidv4(), behavior: "domain" })
                        }
                        block
                        icon={<PlusOutlined />}
                      >
                        添加自定义规则集
                      </Button>
                    </>
                  )}
                </Form.List>
              </Card>

              <Card size="small" title="分流规则 (Rules)" className="mb-6">
                <Typography.Paragraph type="secondary">
                  直接填入规则即可，每行一个。
                </Typography.Paragraph>
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
            <Button
              size="large"
              loading={loadingPreview}
              onClick={async () => {
                try {
                  setLoadingPreview(true);
                  const values = await form.validateFields();
                  const payload = buildPayload(values);
                  const resp = await api.previewSub(payload);
                  const content = resp.data?.content || "";
                  setLoadingPreview(false);
                  modal.info({
                    title: "完整配置预览",
                    width: 900,
                    closable: true,
                    maskClosable: true,
                    okText: "关闭",
                    content: (
                      <div
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 8,
                          overflow: "hidden"
                        }}
                      >
                        <Editor
                          height="600px"
                          theme="vs-dark"
                          defaultLanguage="yaml"
                          value={content}
                          options={{
                            readOnly: true,
                            minimap: { enabled: false }
                          }}
                        />
                      </div>
                    )
                  });
                } catch (e: any) {
                  setLoadingPreview(false);
                  if (!e?.values.name.trim()) {
                    message.error("请输入节点名称！");
                    document
                      .querySelector("#subscription-form")
                      ?.scrollIntoView({ behavior: "smooth" });
                    return;
                  }
                  message.error(e.message || "预览失败");
                }
              }}
            >
              {loadingPreview ? "配置生成中..." : "预览完整配置"}
            </Button>
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
