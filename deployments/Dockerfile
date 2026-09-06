# ---- build ----
# 前端是「构建期产物」：Node 只在这一层用，最终镜像里没有 Node、没有 node_modules。
FROM node:22-alpine AS build
WORKDIR /src

# corepack 按 package.json 的 packageManager 字段装对应版本的 pnpm，
# 不用全局装、也不会因为构建机 pnpm 版本不同而产生不一样的依赖树。
RUN corepack enable

# 先只拷依赖清单：这两个文件没变时，Docker 会复用下面 install 那一层的缓存
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# 生产构建。VITE_API_BASE 留空 → 前端走相对路径 /v1，由同域 nginx 反代到后端
RUN pnpm build

# ---- run ----
# 只剩一堆静态文件 + nginx，镜像几十 MB
FROM nginx:1.27-alpine
COPY deployments/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
