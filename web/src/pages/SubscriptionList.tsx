import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  message,
  Modal,
  QRCode,
  Typography,
  Card,
  Row,
  Col,
  Tooltip,
  Input,
  Select
} from "antd";
import copy from "copy-to-clipboard";
import {
  PlusOutlined,
  EditOutlined,
  CopyOutlined,
  QrcodeOutlined,
  DeleteOutlined,
  PoweroffOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  LinkOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  StarOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import { buildSubscriptionUrl } from "../utils/subscriptionUrl";
import StateCard from "../components/StateCard";
import { useNavigate } from "react-router-dom";
import { formatTrafficValue } from "../utils";
import type { Subscription } from "../types";
import Editor from "@monaco-editor/react";
import { debounce } from "lodash-es";
import { api } from "../api";
import dayjs from "dayjs";
import {
  SubscriptionStatus,
  SubscriptionTraffic,
  SubscriptionValidity
  // @ts-ignore
} from "@sub-proxy/types";

export function SubscriptionList() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // filters
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const [traffic, setTraffic] = useState<SubscriptionTraffic | "">("");
  const [validity, setValidity] = useState<SubscriptionValidity | "">("");

  // 从后端数据中获取置顶状态
  const pinned = useMemo(() => {
    return subs
      .filter(s => s.pinnedOrder !== undefined)
      .sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0))
      .map(s => s.id);
  }, [subs]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.listSubs(), api.getSubsStats()]).then(([s, stats]) => {
      setSubs(s.data || []);
      setStats(stats.data || null);
    });
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [subsData, statsData] = await Promise.all([
        api.listSubs(),
        api.getSubsStats()
      ]);
      setSubs(subsData.data || []);
      setStats(statsData.data || null);
    } catch (error) {
      message.error("加载失败");
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }

  const searchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const subsData = await api.searchSubs({
        keyword,
        status,
        traffic,
        validity
      });
      setSubs(subsData.data || []);
    } catch (error) {
      message.error("搜索失败");
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [keyword, status, traffic, validity]);

  // 使用从后端获取的统计数据，如果没有则使用默认值
  const displayStats = useMemo(() => {
    if (stats) {
      return {
        total: stats.total || 0,
        enabled: stats.enabled || 0,
        unlimitedTraffic: stats.unlimitedTraffic || 0,
        permanent: stats.permanent || 0
      };
    }
    // 如果统计数据还未加载，使用本地计算作为后备
    const total = subs.length;
    const enabled = subs.filter(s => s.enabled).length;
    const unlimitedTraffic = subs.filter(
      s => s.totalTrafficBytes === null
    ).length;
    const permanent = subs.filter(s => {
      const startTime = dayjs(s.startAt);
      const expireTime = dayjs(s.expireAt);
      return expireTime.diff(startTime, "year") > 50;
    }).length;

    return { total, enabled, unlimitedTraffic, permanent };
  }, [stats, subs]);

  // 格式化流量显示
  const formatTraffic = (totalBytes: number | null, usedBytes: number | undefined) => {
    const usedStr = formatTrafficValue(usedBytes || 0);

    if (totalBytes === null) {
      return (
        <Space direction="vertical" size={0}>
          <Space size={4}>
            <GlobalOutlined style={{ color: "#52c41a" }} />
            <span style={{ color: "#52c41a", fontWeight: 500 }}>无限流量</span>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
            已用: {usedStr}
          </Typography.Text>
        </Space>
      );
    }

    const totalStr = formatTrafficValue(totalBytes);
    const percent = Math.min(100, Math.round(((usedBytes || 0) / totalBytes) * 100));

    return (
      <Space direction="vertical" size={0} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontWeight: 500 }}>{totalStr}</span>
        </div>
        <div style={{ fontSize: '12px', color: percent > 90 ? percent >= 100 ? '#ff4d4f' : '#faad14' : '#8c8c8c' }}>
          {percent >= 100 ? "已耗尽 " : `已用: ${usedStr} (${percent}%)`}
        </div>
      </Space>
    );
  };

  // 格式化有效期显示
  const formatValidity = (startAt: string, expireAt: string) => {
    const isPermanent = !expireAt;

    if (isPermanent) {
      return (
        <Space size={4}>
          <CheckCircleOutlined style={{ color: "#52c41a" }} />
          <span style={{ color: "#52c41a", fontWeight: 500 }}>永久有效</span>
        </Space>
      );
    }

    const now = dayjs();
    const startTime = dayjs(startAt);
    const expireTime = dayjs(expireAt);
    const isExpired = expireTime.isBefore(now);
    const isExpiringSoon = expireTime.diff(now, "day") <= 7;

    return (
      <Space direction="vertical" size={0} style={{ gap: 4 }}>
        <div>
          <ClockCircleOutlined
            style={{
              marginRight: 4,
              color: isExpired
                ? "#ff4d4f"
                : isExpiringSoon
                  ? "#faad14"
                  : "#1890ff"
            }}
          />
          <span
            style={{
              color: isExpired
                ? "#ff4d4f"
                : isExpiringSoon
                  ? "#faad14"
                  : "#1890ff",
              fontWeight: 500
            }}
          >
            {isExpired ? "已过期" : isExpiringSoon ? "即将过期" : "限时有效"}
          </span>
        </div>
        <Typography.Text type="secondary" style={{ display: 'inline-block', fontSize: "12px", whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
          {`${startTime.format("YYYY-MM-DD HH:mm")}\n${expireTime.format("YYYY-MM-DD HH:mm")}`}
        </Typography.Text>
      </Space>
    );
  };

  const togglePin = async (id: string) => {
    const exists = pinned.includes(id);
    let newPinned: string[];

    if (exists) {
      // 取消置顶
      newPinned = pinned.filter(x => x !== id);
    } else {
      // 添加置顶
      if (pinned.length >= 3) {
        message.warning("最多可置顶 3 个订阅");
        return;
      }
      newPinned = [id, ...pinned];
    }

    try {
      await api.updatePinnedOrder(newPinned);
      // 刷新数据以获取最新的置顶状态
      await refresh();
      message.success(exists ? "已取消置顶" : "已置顶");
    } catch (error) {
      message.error("操作失败，请重试");
      console.error("Toggle pin error:", error);
    }
  };

  // 当搜索条件改变时自动搜索
  useEffect(() => {
    const debouncedSearch = debounce(searchSubs, 500);
    debouncedSearch();
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchSubs]);

  // 数据已经由后端过滤，直接使用
  const filtered = subs;

  // 基础排序：置顶项优先，然后按创建时间倒序
  const ordered = useMemo(() => {
    const arr = [...filtered].sort((a, b) => {
      // 置顶项优先
      const aPinned = a.pinnedOrder !== undefined;
      const bPinned = b.pinnedOrder !== undefined;

      if (aPinned && bPinned) {
        return (a.pinnedOrder || 0) - (b.pinnedOrder || 0);
      }
      if (aPinned) return -1;
      if (bPinned) return 1;

      // 非置顶项按创建时间倒序排序
      return (
        new Date(b.createAt || b.lastUpdatedAt).getTime() -
        new Date(a.createAt || a.lastUpdatedAt).getTime()
      );
    });
    return arr;
  }, [filtered]);

  return (
    <div className="max-w px-6 py-4 space-y-4">
      {/* 统计仪表盘 */}
      <div className="mb-6">
        <Typography.Title level={3} className="mb-4 flex items-center">
          <BarChartOutlined className="mr-2 text-blue-500" />
          数据概览
        </Typography.Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <StateCard
              title="总订阅数"
              subTitle="所有订阅配置"
              value={displayStats.total}
              bgColor="#1890ff"
              icon={<CheckCircleOutlined className="text-2xl text-blue-500" />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StateCard
              title="已启用"
              subTitle="活跃订阅数量"
              value={displayStats.enabled}
              bgColor="#52c41a"
              icon={<ThunderboltOutlined className="text-2xl text-green-500" />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StateCard
              title="无限流量"
              subTitle="无流量限制订阅"
              value={displayStats.unlimitedTraffic}
              bgColor="#722ed1"
              icon={<RocketOutlined className="text-2xl text-purple-500" />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StateCard
              title="永久有效"
              subTitle="永久有效订阅"
              value={displayStats.permanent}
              bgColor="#fa8c16"
              icon={<StarOutlined className="text-2xl text-orange-500" />}
            />
          </Col>
        </Row>
      </div>

      {/* 订阅列表 */}
      <Card className="shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
          <div>
            <Typography.Title level={4} className="flex items-center">
              <CheckCircleOutlined className="mr-2 text-green-500" />
              订阅列表
            </Typography.Title>
            <Typography.Text type="secondary">
              管理所有订阅配置，支持置顶、编辑、复制和删除。
            </Typography.Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => navigate("/create")}
              className="shadow-md hover:shadow-lg transition-all duration-200"
            >
              创建订阅
            </Button>
          </div>
        </div>
        {/* 搜索筛选区域 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={8}>
              <div>
                <Typography.Text className="text-sm text-gray-600 mb-1 block">
                  搜索订阅名称
                </Typography.Text>
                <Input.Search
                  allowClear
                  value={keyword}
                  placeholder="输入订阅名称搜索..."
                  onChange={e => setKeyword(e.target.value)}
                  onSearch={searchSubs}
                  enterButton
                  loading={loading}
                  size="large"
                />
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div>
                <Typography.Text className="text-sm text-gray-600 mb-1 block">
                  状态筛选
                </Typography.Text>
                <Select
                  value={status}
                  onChange={setStatus}
                  style={{ width: "100%" }}
                  size="large"
                  options={[
                    { value: "", label: "全部" },
                    { value: "enabled", label: "已启用" },
                    { value: "disabled", label: "已禁用" }
                  ]}
                />
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div>
                <Typography.Text className="text-sm text-gray-600 mb-1 block">
                  流量类型
                </Typography.Text>
                <Select
                  value={traffic}
                  onChange={setTraffic}
                  style={{ width: "100%" }}
                  size="large"
                  options={[
                    { value: "", label: "全部" },
                    { value: "unlimited", label: "无限流量" },
                    { value: "limited", label: "有限流量" }
                  ]}
                />
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div>
                <Typography.Text className="text-sm text-gray-600 mb-1 block">
                  有效期类型
                </Typography.Text>
                <Select
                  value={validity}
                  onChange={setValidity}
                  style={{ width: "100%" }}
                  size="large"
                  options={[
                    { value: "", label: "全部" },
                    { value: "permanent", label: "永久有效" },
                    { value: "timed", label: "限时有效" }
                  ]}
                />
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div>
                <Typography.Text className="text-sm text-gray-600 mb-1 block">
                  操作
                </Typography.Text>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setKeyword("");
                    setStatus("");
                    setTraffic("");
                    setValidity("");
                  }}
                  style={{ width: "100%" }}
                  size="large"
                  className="border-gray-300 hover:border-blue-400 hover:text-blue-500"
                >
                  重置筛选
                </Button>
              </div>
            </Col>
          </Row>
        </div>
        <Table
          rowKey="id"
          scroll={{ x: 1000 }}
          dataSource={ordered}
          rowClassName={(record: Subscription) =>
            record.pinnedOrder !== undefined ? "pinned-row" : ""
          }
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          size="large"
          columns={[
            {
              title: "订阅名称",
              dataIndex: "name",
              width: 200,
              render: (text: string, record: Subscription) => (
                <div>
                  <Typography.Text strong>{text}</Typography.Text>
                  <br />
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: "12px" }}
                  >
                    ID: {record.id}
                  </Typography.Text>
                </div>
              )
            },
            {
              title: "状态",
              dataIndex: "enabled",
              width: 100,
              align: "center",
              render: (enabled: boolean) => (
                <Tag color={enabled ? "green" : "red"}>
                  {enabled ? "已启用" : "已禁用"}
                </Tag>
              )
            },
            {
              title: "流量统计",
              dataIndex: "totalTrafficBytes",
              width: 150,
              align: "center",
              render: (_, record) => formatTraffic(record.totalTrafficBytes, record.usedTrafficBytes)
            },
            {
              title: "有效期",
              dataIndex: "expireAt",
              width: 200,
              align: "center",
              render: (_, record) =>
                formatValidity(record.startAt, record.expireAt)
            },
            {
              title: "创建时间",
              dataIndex: "createAt",
              width: 200,
              align: "center",
              render: (_: any, record: Subscription) => {
                const time = record.createAt || record.lastUpdatedAt;
                return (
                  <Tooltip title={dayjs(time).format("YYYY-MM-DD HH:mm:ss")}>
                    <Typography.Text type="secondary">
                      {dayjs(time).fromNow()}
                    </Typography.Text>
                  </Tooltip>
                );
              }
            },
            {
              title: "更新时间",
              dataIndex: "lastUpdatedAt",
              width: 200,
              align: "center",
              render: (_: any, record: Subscription) => {
                const time = record.lastUpdatedAt;
                return (
                  <Tooltip title={dayjs(time).format("YYYY-MM-DD HH:mm:ss")}>
                    <Typography.Text type="secondary">
                      {dayjs(time).format("YYYY-MM-DD HH:mm:ss")}
                    </Typography.Text>
                  </Tooltip>
                );
              }
            },
            {
              title: "操作",
              width: 150,
              align: "center",
              render: (_, record) => (
                <RowActions
                  sub={record}
                  onChanged={refresh}
                  onEdit={() => navigate(`/edit/${record.id}`)}
                  onDuplicate={() =>
                    navigate("/create", {
                      state: { duplicateFrom: record }
                    })
                  }
                  pinnedIds={pinned}
                  onTogglePin={togglePin}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}

function RowActions({
  sub,
  onChanged,
  onEdit,
  onDuplicate,
  pinnedIds,
  onTogglePin
}: {
  sub: Subscription;
  onChanged: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  pinnedIds: string[];
  onTogglePin: (id: string) => void;
}) {
  return (
    <Space direction="vertical" size={0} style={{ alignItems: "flex-end" }}>
      <Space size={4}>
        <Tooltip
          title={pinnedIds.includes(sub.id) ? "取消置顶" : "置顶（最多3个）"}
        >
          <Button
            type="text"
            style={{ width: 36 }}
            onClick={() => onTogglePin(sub.id)}
          >
            {pinnedIds.includes(sub.id) ? "📌" : "📍"}
          </Button>
        </Tooltip>
        <Tooltip title="预览完整配置">
          <Button
            type="text"
            style={{ width: 36 }}
            onClick={async () => {
              try {
                const content = await api.previewYaml(sub.id);
                Modal.info({
                  title: `配置预览 > ${sub.name}`,
                  width: 800,
                  closable: true,
                  maskClosable: true,
                  okText: "关闭",
                  content: (
                    <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
                      <Editor
                        height="500px"
                        theme="vs-dark"
                        defaultLanguage="yaml"
                        value={content}
                        options={{ readOnly: true, minimap: { enabled: false } }}
                      />
                    </div>
                  )
                });
              } catch (e: any) {
                message.error(e.message || "预览失败");
              }
            }}
          >
            👁️
          </Button>
        </Tooltip>
        <Tooltip title="编辑">
          <Button
            type="text"
            style={{ width: 36 }}
            icon={<EditOutlined />}
            onClick={onEdit}
          />
        </Tooltip>
        <Tooltip title={sub.enabled ? "禁用" : "启用"}>
          <Button
            type="text"
            style={{ width: 36 }}
            icon={sub.enabled ? <PoweroffOutlined /> : <PlayCircleOutlined />}
            onClick={async () => {
              await api.toggleSub(sub.id);
              onChanged();
              message.success(sub.enabled ? "已禁用" : "已启用");
            }}
          />
        </Tooltip>
      </Space>
      <Space size={4}>
        <Tooltip title="复制订阅URL">
          <Button
            type="text"
            style={{ width: 36 }}
            icon={<LinkOutlined />}
            onClick={() => {
              const url = buildSubscriptionUrl(sub.id, true);
              const success = copy(url);
              if (success) {
                message.success("已复制订阅URL");
                return;
              }
              message.error("复制失败");
            }}
          />
        </Tooltip>
        <Tooltip title="显示二维码">
          <Button
            type="text"
            style={{ width: 36 }}
            icon={<QrcodeOutlined />}
            onClick={() => {
              const url = buildSubscriptionUrl(sub.id, true);
              const yamlUrl = buildSubscriptionUrl(sub.id, true, true);
              Modal.info({
                title: "二维码",
                width: 400,
                closable: true,
                maskClosable: true,
                okButtonProps: {
                  style: {
                    display: "none"
                  }
                },
                content: (
                  <div className="flex flex-col items-center -ml-10 py-4 gap-2">
                    <QRCode value={url} size={200} />
                    <Typography.Title level={5}>{sub.name}</Typography.Title>
                    <Typography.Text
                      copyable
                      style={{
                        wordBreak: "break-all",
                        color: "#666",
                        fontSize: 14
                      }}
                    >
                      {url}
                    </Typography.Text>
                    <Typography.Link href={yamlUrl} target="_blank">
                      下载订阅配置文件
                    </Typography.Link>
                  </div>
                )
              });
            }}
          />
        </Tooltip>
        <Tooltip title="基于此配置创建新订阅">
          <Button
            type="text"
            style={{ width: 36 }}
            icon={<CopyOutlined />}
            onClick={onDuplicate}
          />
        </Tooltip>
        <Popconfirm
          title="确认删除"
          description="删除后无法恢复，确定要删除这个订阅吗？"
          onConfirm={async () => {
            await api.deleteSub(sub.id);
            onChanged();
            message.success("已删除");
          }}
          okText="确定"
          cancelText="取消"
        >
          <Tooltip title="删除订阅">
            <Button
              type="text"
              style={{ width: 36 }}
              danger
              icon={<DeleteOutlined />}
            />
          </Tooltip>
        </Popconfirm>
      </Space>
    </Space>
  );
}
