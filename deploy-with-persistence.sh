#!/bin/bash

# SubProxy 部署脚本 - 支持数据持久化
# 使用方法: ./deploy-with-persistence.sh [BASE_URL]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 和 Docker Compose
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 创建数据目录
create_data_directories() {
    log_info "创建数据目录..."
    
    # 创建数据目录
    mkdir -p data uploads logs
    
    # 注意：不复制 db_default.json 到外部目录
    # db_default.json 作为系统默认数据，不进行持久化映射
    # 首次启动时，应用会从容器内的 db_default.json 加载默认数据
    log_info "默认数据将在容器启动时自动加载"
    
    # 创建默认头像目录
    mkdir -p uploads/avatar
    
    # 设置权限
    chmod -R 755 data uploads logs
    
    log_success "数据目录创建完成"
}

# 构建镜像
build_image() {
    log_info "构建 Docker 镜像..."
    
    docker build -t sub-proxy:latest .
    
    if [ $? -eq 0 ]; then
        log_success "镜像构建成功"
    else
        log_error "镜像构建失败"
        exit 1
    fi
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 设置环境变量
    if [ -n "$1" ]; then
        export BASE_URL="$1"
        log_info "使用自定义 BASE_URL: $BASE_URL"
    else
        log_info "使用默认 BASE_URL: http://localhost:3001"
    fi
    
    # 启动服务
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        log_success "服务启动成功"
    else
        log_error "服务启动失败"
        exit 1
    fi
}

# 检查服务状态
check_status() {
    log_info "检查服务状态..."
    
    sleep 5
    
    if docker-compose ps | grep -q "Up"; then
        log_success "服务运行正常"
        
        # 显示访问信息
        echo ""
        log_info "=== 访问信息 ==="
        echo "管理界面: http://localhost:3001"
        echo "默认账号: admin"
        echo "默认密码: admin123456"
        echo ""
        log_info "=== 数据持久化 ==="
        echo "数据目录: ./data"
        echo "上传文件: ./uploads"
        echo "日志文件: ./logs"
        echo ""
        log_info "=== 管理命令 ==="
        echo "查看日志: docker-compose logs -f"
        echo "停止服务: docker-compose down"
        echo "重启服务: docker-compose restart"
        echo "更新服务: docker-compose pull && docker-compose up -d"
        
    else
        log_error "服务启动失败，请检查日志"
        docker-compose logs
        exit 1
    fi
}

# 主函数
main() {
    echo "=========================================="
    echo "    SubProxy 部署脚本 - 数据持久化版本"
    echo "=========================================="
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 创建数据目录
    create_data_directories
    
    # 构建镜像
    build_image
    
    # 启动服务
    start_services "$1"
    
    # 检查状态
    check_status
    
    echo ""
    log_success "部署完成！"
}

# 执行主函数
main "$@"
