# Dify 系统服务发现指南

## 🚀 概述

Dify 系统采用分布式微服务架构，在 Linux 服务器上通过 Docker Compose 部署后，需要实施完整的服务发现方案来确保各服务间的正常通信和外部访问。

## 📋 服务架构图

```
外部用户
    ↓
[Nginx:80/443] ← 入口点
    ↓
┌─────────────────────────────────────┐
│  前端服务                            │
│  [web:3000] - Next.js 应用          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  应用层服务                          │
│  [api:5001] - Flask API             │
│  [worker] - Celery Worker           │
│  [plugin_daemon:5002] - 插件服务     │
│  [sandbox:8194] - 代码执行沙箱      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  数据层服务                          │
│  [db:5432] - PostgreSQL             │
│  [redis:6379] - Redis               │
│  [weaviate:8080] - 向量数据库       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  安全代理                            │
│  [ssrf_proxy:3128] - 安全代理       │
└─────────────────────────────────────┘
```

## 🔧 服务发现配置

### 1. 内部服务发现

#### Docker 内置 DNS 解析
```yaml
# docker-compose.yaml 中的服务通过容器名称互相发现
api:
  environment:
    DB_HOST: db
    DB_PORT: 5432
    REDIS_HOST: redis
    REDIS_PORT: 6379
    WEAVIATE_ENDPOINT: http://weaviate:8080
```

#### 网络配置
```yaml
networks:
  default:
    driver: bridge
  ssrf_proxy_network:
    driver: bridge
    internal: true  # 安全隔离网络
```

### 2. 外部服务发现

#### Nginx 反向代理配置
```nginx
# /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;

    # API 路由
    location /console/api {
        proxy_pass http://api:5001;
    }
    
    location /api {
        proxy_pass http://api:5001;
    }
    
    location /v1 {
        proxy_pass http://api:5001;
    }
    
    # 文件服务
    location /files {
        proxy_pass http://api:5001;
    }
    
    # 插件服务
    location /e/ {
        proxy_pass http://plugin_daemon:5002;
    }
    
    # 前端应用
    location / {
        proxy_pass http://web:3000;
    }
}
```

## 🏥 健康检查机制

### 1. 数据库健康检查
```yaml
db:
  healthcheck:
    test: ['CMD', 'pg_isready', '-h', 'db', '-U', 'postgres', '-d', 'dify']
    interval: 1s
    timeout: 3s
    retries: 60
```

### 2. Redis 健康检查
```yaml
redis:
  healthcheck:
    test: ['CMD', 'redis-cli', 'ping']
    interval: 30s
    timeout: 10s
    retries: 3
```

### 3. 应用服务健康检查
```yaml
sandbox:
  healthcheck:
    test: ['CMD', 'curl', '-f', 'http://localhost:8194/health']
    interval: 30s
    timeout: 10s
    retries: 3
```

## 🔍 服务发现验证

### 1. 内部服务连通性检查
```bash
# 进入 API 容器检查内部连接
docker exec -it dify-api-1 /bin/bash

# 测试数据库连接
pg_isready -h db -p 5432 -U postgres

# 测试 Redis 连接
redis-cli -h redis -p 6379 ping

# 测试向量数据库连接
curl -f http://weaviate:8080/v1/.well-known/ready
```

### 2. 外部访问验证
```bash
# 检查主页访问
curl -I http://localhost/

# 检查 API 健康状态
curl -I http://localhost/health

# 检查控制台 API
curl -I http://localhost/console/api/setup

# 检查应用 API
curl -I http://localhost/api/apps
```

## 🚀 部署实施步骤

### 1. 环境准备
```bash
# 确保 Docker 和 Docker Compose 已安装
docker --version
docker-compose --version

# 克隆项目
git clone https://github.com/chenxingqiang/fanfei-agent.git
cd fanfei-agent
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑关键配置
vim .env
```

关键环境变量：
```env
# 应用配置
CONSOLE_WEB_URL=http://localhost
APP_WEB_URL=http://localhost

# 数据库配置
DB_HOST=db
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=difyai123456
DB_DATABASE=dify

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=difyai123456

# 向量数据库配置
VECTOR_STORE=weaviate
WEAVIATE_ENDPOINT=http://weaviate:8080
WEAVIATE_API_KEY=WVF5YThaHlkYwhGUSmCRgsX3tD5ngdN8pkih

# Nginx 配置
NGINX_PORT=80
EXPOSE_NGINX_PORT=80
```

### 3. 启动服务
```bash
# 启动所有服务
docker-compose up -d

# 检查服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f
```

### 4. 验证部署
```bash
# 检查所有容器状态
docker ps

# 验证服务健康状态
curl http://localhost/health

# 访问应用
curl http://localhost/apps
```

## 🔧 故障排除

### 1. 常见问题

#### 服务无法启动
```bash
# 检查容器日志
docker-compose logs [service_name]

# 检查资源使用
docker stats

# 重启特定服务
docker-compose restart [service_name]
```

#### 网络连接问题
```bash
# 检查网络配置
docker network ls
docker network inspect dify_default

# 测试容器间连通性
docker exec -it dify-api-1 ping db
docker exec -it dify-api-1 ping redis
```

#### 数据库连接失败
```bash
# 检查数据库状态
docker-compose logs db

# 手动连接测试
docker exec -it dify-db-1 psql -U postgres -d dify
```

### 2. 性能优化

#### 资源配置
```yaml
# docker-compose.yaml
services:
  db:
    deploy:
      resources:
        limits:
          memory: 2g
          cpus: '1.0'
        reservations:
          memory: 1g
          cpus: '0.5'
```

#### 缓存优化
```env
# Redis 配置优化
REDIS_PASSWORD=strong_password
REDIS_DB=0
SQLALCHEMY_POOL_SIZE=30
SQLALCHEMY_POOL_RECYCLE=3600
```

## 🔐 安全配置

### 1. 网络安全
```yaml
# 使用内部网络隔离敏感服务
networks:
  ssrf_proxy_network:
    driver: bridge
    internal: true
```

### 2. 访问控制
```env
# 强密码配置
SECRET_KEY=your_strong_secret_key
DB_PASSWORD=strong_db_password
REDIS_PASSWORD=strong_redis_password
WEAVIATE_API_KEY=strong_weaviate_key
```

### 3. HTTPS 配置
```env
# SSL 证书配置
NGINX_HTTPS_ENABLED=true
NGINX_SSL_CERT_FILENAME=dify.crt
NGINX_SSL_CERT_KEY_FILENAME=dify.key
```

## 📊 监控与维护

### 1. 服务监控
```bash
# 实时监控容器状态
watch docker-compose ps

# 监控资源使用
docker stats --no-stream

# 检查服务健康状态
curl -s http://localhost/health | jq .
```

### 2. 日志管理
```bash
# 查看实时日志
docker-compose logs -f --tail=100

# 日志轮转配置
docker-compose logs --since=1h api
```

### 3. 备份策略
```bash
# 数据库备份
docker exec dify-db-1 pg_dump -U postgres dify > backup.sql

# 卷数据备份
docker run --rm -v dify_db_data:/data -v $(pwd):/backup alpine tar czf /backup/db_backup.tar.gz /data
```

## 🔄 服务扩展

### 1. 水平扩展
```yaml
# 扩展 API 服务
api:
  deploy:
    replicas: 3
    update_config:
      parallelism: 1
      delay: 10s
```

### 2. 负载均衡
```nginx
# Nginx 负载均衡配置
upstream api_backend {
    server api_1:5001;
    server api_2:5001;
    server api_3:5001;
}

location /api {
    proxy_pass http://api_backend;
}
```

## 📝 总结

通过以上配置，Dify 系统实现了：

1. **完整的内部服务发现**：基于 Docker DNS 和容器网络
2. **统一的外部入口**：通过 Nginx 反向代理
3. **健康检查机制**：确保服务可用性
4. **安全网络隔离**：保护敏感服务
5. **可扩展架构**：支持水平和垂直扩展

这套方案确保了 Fanfei Agent 系统在生产环境中的稳定运行和高可用性。 