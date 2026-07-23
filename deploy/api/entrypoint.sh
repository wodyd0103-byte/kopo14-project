#!/bin/sh
set -e

# 볼륨이 비어 있을 때만 초기 데이터를 넣는다.
# 이미 있으면 건드리지 않는다 — 배포할 때마다 등록한 가게와 리뷰가 날아가면 안 되니까.
if [ ! -f /data/db.json ]; then
  echo "[api] /data/db.json 이 없어 초기 데이터를 복사합니다."
  cp /seed/db.json /data/db.json
else
  echo "[api] 기존 /data/db.json 을 그대로 사용합니다."
fi

exec json-server --watch /data/db.json --host 0.0.0.0 --port 3000
