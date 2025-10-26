#!/bin/bash

# SubProxy 数据管理脚本
# 使用方法: ./manage-data.sh [backup|restore|reset|status]

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

# 备份数据
backup_data() {
    log_info "备份数据..."
    
    local backup_dir="backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="subproxy_backup_${timestamp}.tar.gz"
    
    mkdir -p "$backup_dir"
    
    # 创建备份
    tar -czf "$backup_dir/$backup_file" data/ uploads/ logs/ 2>/dev/null || {
        log_warning "部分目录不存在，继续备份..."
        tar -czf "$backup_dir/$backup_file" data/ uploads/ logs/ 2>/dev/null || true
    }
    
    if [ -f "$backup_dir/$backup_file" ]; then
        log_success "备份完成: $backup_dir/$backup_file"
        echo "备份文件大小: $(du -h "$backup_dir/$backup_file" | cut -f1)"
    else
        log_error "备份失败"
        exit 1
    fi
}

# 恢复数据
restore_data() {
    log_info "恢复数据..."
    
    local backup_dir="backups"
    local latest_backup=$(ls -t "$backup_dir"/*.tar.gz 2>/dev/null | head -n1)
    
    if [ -z "$latest_backup" ]; then
        log_error "未找到备份文件"
        exit 1
    fi
    
    log_info "使用备份文件: $latest_backup"
    
    # 停止服务
    log_info "停止服务..."
    docker-compose down 2>/dev/null || true
    
    # 恢复数据
    tar -xzf "$latest_backup"
    
    log_success "数据恢复完成"
    
    # 重启服务
    log_info "重启服务..."
    docker-compose up -d
}

# 重置数据
reset_data() {
    log_warning "这将删除所有数据并重置为默认状态！"
    read -p "确认继续？(y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        exit 0
    fi
    
    log_info "重置数据..."
    
    # 停止服务
    docker-compose down 2>/dev/null || true
    
    # 备份当前数据
    if [ -d "data" ] && [ "$(ls -A data 2>/dev/null)" ]; then
        log_info "备份当前数据..."
        backup_data
    fi
    
    # 删除数据目录
    rm -rf data uploads logs
    
    # 重新创建
    mkdir -p data uploads/avatar logs
    
    # 注意：不复制 db_default.json 到外部目录
    # db_default.json 作为系统默认数据，不进行持久化映射
    # 重置时，应用会从容器内的 db_default.json 重新加载默认数据
    log_info "默认数据将在容器重启时自动加载"
    
    # 设置权限
    chmod -R 755 data uploads logs
    
    # 重启服务
    docker-compose up -d
    
    log_success "数据重置完成"
}

# 查看状态
show_status() {
    log_info "数据状态:"
    echo ""
    
    # 数据目录状态
    if [ -d "data" ]; then
        echo "📁 数据目录 (data/):"
        if [ -f "data/db.json" ]; then
            echo "  ✅ 数据库文件存在"
            echo "  📊 文件大小: $(du -h data/db.json | cut -f1)"
            echo "  📅 修改时间: $(stat -c %y data/db.json 2>/dev/null || stat -f %Sm data/db.json 2>/dev/null || echo '未知')"
        else
            echo "  ❌ 数据库文件不存在"
        fi
    else
        echo "  ❌ 数据目录不存在"
    fi
    
    echo ""
    
    # 上传目录状态
    if [ -d "uploads" ]; then
        echo "📁 上传目录 (uploads/):"
        local upload_count=$(find uploads -type f 2>/dev/null | wc -l)
        echo "  📊 文件数量: $upload_count"
        if [ -d "uploads/avatar" ]; then
            local avatar_count=$(find uploads/avatar -type f 2>/dev/null | wc -l)
            echo "  🖼️  头像文件: $avatar_count"
        fi
    else
        echo "  ❌ 上传目录不存在"
    fi
    
    echo ""
    
    # 日志目录状态
    if [ -d "logs" ]; then
        echo "📁 日志目录 (logs/):"
        local log_count=$(find logs -type f 2>/dev/null | wc -l)
        echo "  📊 日志文件: $log_count"
    else
        echo "  ❌ 日志目录不存在"
    fi
    
    echo ""
    
    # 备份状态
    if [ -d "backups" ]; then
        echo "📁 备份目录 (backups/):"
        local backup_count=$(find backups -name "*.tar.gz" 2>/dev/null | wc -l)
        echo "  📊 备份文件: $backup_count"
        if [ $backup_count -gt 0 ]; then
            echo "  📅 最新备份: $(ls -t backups/*.tar.gz 2>/dev/null | head -n1 | xargs basename 2>/dev/null || echo '未知')"
        fi
    else
        echo "  ❌ 备份目录不存在"
    fi
    
    echo ""
    
    # 服务状态
    if docker-compose ps | grep -q "Up"; then
        echo "🐳 服务状态: 运行中"
    else
        echo "🐳 服务状态: 未运行"
    fi
}

# 显示帮助
show_help() {
    echo "SubProxy 数据管理脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 backup    - 备份数据"
    echo "  $0 restore   - 恢复数据"
    echo "  $0 reset     - 重置数据"
    echo "  $0 status    - 查看状态"
    echo "  $0 help      - 显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 backup    # 备份当前数据"
    echo "  $0 restore   # 恢复最新备份"
    echo "  $0 reset     # 重置为默认数据"
    echo "  $0 status    # 查看数据状态"
}

# 主函数
main() {
    case "${1:-help}" in
        backup)
            backup_data
            ;;
        restore)
            restore_data
            ;;
        reset)
            reset_data
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
