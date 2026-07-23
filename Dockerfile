# 프론트엔드: Vite로 빌드한 정적 파일을 nginx가 서빙하고, API 호출은 프록시로 넘긴다.

# 1) 빌드
FROM node:22-alpine AS build
WORKDIR /app

# 소스보다 락파일을 먼저 복사해야 의존성 레이어가 캐시된다
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# 2) 서빙
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# nginx 공식 이미지는 시작할 때 templates/*.template에 envsubst를 돌려 conf.d로 넣는다.
# FILTER를 걸지 않으면 $uri, $host 같은 nginx 변수까지 빈 값으로 치환되어 설정이 깨진다.
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
ENV NGINX_ENVSUBST_FILTER="^(API_TARGET|NAVER_CLIENT_ID|NAVER_CLIENT_SECRET)$" \
    API_TARGET="http://kopo14-api:3000" \
    NAVER_CLIENT_ID="" \
    NAVER_CLIENT_SECRET=""

EXPOSE 80
