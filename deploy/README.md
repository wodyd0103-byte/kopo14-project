# 배포 (GitHub + ArgoCD)

로컬 쿠버네티스에 올리고, GitHub에 밀면 자동으로 반영되게 하는 방법입니다.

## 어떻게 굴러가나

```
코드 수정 → git push → GitHub Actions ─┬─ 이미지 빌드 → GHCR에 업로드
                                       └─ 매니페스트의 이미지 태그를 커밋
                                                  ↓
                                       ArgoCD가 그 커밋을 보고 클러스터를 맞춤
```

핵심은 **아무도 `kubectl apply`를 하지 않는다**는 점입니다. 클러스터의 상태는
git 저장소가 정하고, ArgoCD는 그 차이를 계속 메웁니다. 이게 GitOps입니다.

배포되는 것은 두 덩어리입니다.

| 이름 | 정체 | 비고 |
|---|---|---|
| `kopo14-web` | 빌드된 정적 파일 + nginx | 2개, `/api`와 `/naver-api`를 프록시 |
| `kopo14-api` | json-server | 1개, `db.json`을 볼륨에 보관 |

`db.json`은 파일 하나를 직접 고쳐 쓰는 구조라 **API는 반드시 1개만** 띄웁니다.
2개가 동시에 쓰면 서로 덮어써서 데이터가 깨집니다.

---

## 준비물 설치 (한 번만)

### 1. Docker Desktop + 쿠버네티스

[Docker Desktop](https://www.docker.com/products/docker-desktop/)을 설치하고
**Settings → Kubernetes → Enable Kubernetes** 를 켭니다. 초록불이 들어올 때까지
몇 분 걸립니다. `kubectl`도 같이 깔립니다.

```powershell
kubectl get nodes
```

`desktop-control-plane  Ready` 가 나오면 됩니다.

> `kubectl`을 못 찾는다고 나오면 **터미널을 새로 여세요.** 설치하면서 추가된 PATH가
> 이미 열려 있던 창에는 반영되지 않습니다. 그래도 안 되면 경로를 직접 씁니다:
> `$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"`

### 2. Ingress 컨트롤러

바깥에서 들어오는 요청을 받아 줄 문지기입니다.

```powershell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.15.1/deploy/static/provider/cloud/deploy.yaml
kubectl -n ingress-nginx wait --for=condition=ready pod -l app.kubernetes.io/component=controller --timeout=240s
```

컨트롤러 Service의 `EXTERNAL-IP`는 계속 `<pending>`으로 남습니다. 정상입니다 —
아래 '접속하기'에서 설명합니다.

그런데 이것 때문에 Ingress에 주소가 안 찍히고, **ArgoCD가 앱을 영원히
`Progressing`으로 표시합니다.** 파드가 다 떠 있어도 그렇습니다. 컨트롤러가
주소를 직접 게시하도록 바꿔 주면 해결됩니다.

```powershell
kubectl -n ingress-nginx patch deployment ingress-nginx-controller --type=json --% -p=[{"op":"remove","path":"/spec/template/spec/containers/0/args/1"},{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--publish-status-address=localhost"}]
kubectl -n ingress-nginx rollout status deployment/ingress-nginx-controller
```

인덱스 1을 지우는 것은 `--publish-service`입니다. **둘은 동시에 못 씁니다** —
같이 두면 컨트롤러가 `mutually exclusive` 오류로 CrashLoopBackOff에 빠집니다.
지우기 전에 무엇이 1번인지 확인하세요.

```powershell
kubectl -n ingress-nginx get deployment ingress-nginx-controller -o jsonpath="{range .spec.template.spec.containers[0].args[*]}{@}{'\n'}{end}"
```

### 3. ArgoCD

`--server-side`가 **필요합니다.** 그냥 `apply` 하면 ArgoCD의 CRD 하나가
너무 커서 `metadata.annotations: Too long` 오류로 설치가 깨집니다.

```powershell
kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd wait --for=condition=available deployment --all --timeout=420s
```

초기 비밀번호(아이디는 `admin`)를 확인합니다.

```powershell
$pw = kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}"
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($pw))
```

웹 UI는 포트포워딩으로 엽니다. 이 창은 켜 둔 채로 두세요.

```powershell
kubectl -n argocd port-forward svc/argocd-server 8080:443
```

→ https://localhost:8080 (자체 서명 인증서라 경고가 뜹니다. 무시하고 진행)

### 4. 접속하기 (port-forward)

요즘 Docker Desktop의 쿠버네티스는 kind 기반이라 **LoadBalancer를 처리해 줄
주체가 없습니다.** 그래서 Ingress 컨트롤러의 `EXTERNAL-IP`가 영영 `<pending>`이고,
그냥 두면 브라우저에서 닿지 않습니다. port-forward로 길을 뚫습니다.

```powershell
kubectl -n ingress-nginx port-forward svc/ingress-nginx-controller 8080:80
```

**이 창은 켜 둔 채로 두세요.** 닫으면 접속이 끊깁니다. 그리고 Ingress 컨트롤러
파드가 교체되면(재시작·업그레이드 등) **port-forward도 같이 죽습니다.** 갑자기
"연결할 수 없음"이 뜨면 이 명령을 다시 실행하세요.

→ http://localhost:8080

80번이 아니라 8080인 이유는, 윈도우에서 80번을 `System`(HTTP.sys)이 예약해 두어
바인딩이 거부되기 때문입니다. 확인해 보려면:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 80 | Select-Object LocalAddress,OwningProcess
```

`kopo14.local`이라는 이름으로 열고 싶다면 **관리자 권한** 메모장으로
`C:\Windows\System32\drivers\etc\hosts`에 아래를 추가하세요. Ingress에 두 이름이
모두 등록돼 있어 어느 쪽으로 열어도 됩니다.

```
127.0.0.1 kopo14.local
```

→ http://kopo14.local:8080

---

## 저장소 올리기

```powershell
git init -b main
git add -A
git commit -m "음식점 기록 앱"
gh repo create kopo14-project --public --source=. --push
```

`.env`(네이버 키)는 `.gitignore`에 있어 올라가지 않습니다. **확인하세요.**

```powershell
git ls-files | Select-String "^\.env$"
```

아무것도 안 나와야 정상입니다.

### GHCR 패키지를 공개로

첫 푸시 후 Actions가 이미지를 올리면, GitHub 저장소 우측 **Packages**에
`kopo14-web`, `kopo14-api`가 생깁니다. 각각 들어가서
**Package settings → Change visibility → Public**으로 바꿉니다.

비공개로 두면 로컬 클러스터가 이미지를 못 받아 옵니다. 굳이 비공개로 쓰려면
`imagePullSecret`을 따로 만들어야 합니다.

---

## 배포

### 1. 네이버 키를 클러스터에 넣기 (선택)

git에 올리면 안 되는 값이라 클러스터에 직접 넣습니다.

```powershell
kubectl create namespace kopo14
kubectl -n kopo14 create secret generic kopo14-naver `
  --from-literal=NAVER_CLIENT_ID=발급받은_아이디 `
  --from-literal=NAVER_CLIENT_SECRET=발급받은_시크릿
```

건너뛰어도 앱은 뜹니다. 등록 화면의 '가게 검색'만 동작하지 않습니다.

### 2. ArgoCD에 등록

```powershell
kubectl apply -n argocd -f deploy/argocd/application.yaml
```

이 한 줄이 전부입니다. 이후로는 git에 밀기만 하면 됩니다.

### 3. 확인

```powershell
kubectl -n kopo14 get pod,svc,ingress,pvc
```

파드 3개가 `Running`, PVC가 `Bound`가 되면 브라우저에서 http://localhost:8080 을 엽니다.
(위의 port-forward 창이 켜져 있어야 합니다)

ArgoCD가 보는 상태는 이렇게 확인합니다.

```powershell
kubectl -n argocd get application kopo14
```

`SYNC STATUS=Synced`, `HEALTH STATUS=Healthy` 면 정상입니다.

---

## 바꾸고 반영하기

```powershell
git add -A
git commit -m "수정한 내용"
git push
```

끝입니다. Actions 탭에서 빌드가 끝나면(2~4분) ArgoCD가 3분 안에 알아서 당겨 갑니다.
기다리기 싫으면 ArgoCD UI에서 **REFRESH → SYNC**를 누르세요.

---

## 막힐 때

**Pod가 `ImagePullBackOff`**
GHCR 패키지가 아직 비공개입니다. 위의 '공개로 바꾸기'를 하세요.

```powershell
kubectl -n kopo14 describe pod -l app.kubernetes.io/name=kopo14-web | Select-String -Context 0,5 "Failed"
```

**web Pod가 `CrashLoopBackOff`**
nginx가 뜰 때 `kopo14-api` 이름을 못 찾으면 죽습니다. API Service가 먼저
만들어지면 다음 재시작에서 알아서 붙으니 잠시 기다려 보세요. 계속 그러면 로그를 봅니다.

```powershell
kubectl -n kopo14 logs -l app.kubernetes.io/name=kopo14-web --tail=50
```

**화면은 뜨는데 목록이 비어 있음**
API를 못 부르고 있습니다. 브라우저 개발자도구 Network에서 `/api/restaurants`의
응답 코드를 보고, 그 다음 API 로그를 확인합니다.

```powershell
kubectl -n kopo14 logs -l app.kubernetes.io/name=kopo14-api --tail=50
```

**`/best` 같은 주소를 새로고침하면 404**
nginx의 `try_files` 설정이 안 먹은 경우입니다. `deploy/nginx/default.conf.template`이
이미지에 제대로 들어갔는지 확인하세요.

```powershell
kubectl -n kopo14 exec deploy/kopo14-web -- cat /etc/nginx/conf.d/default.conf
```

`${API_TARGET}` 같은 글자가 그대로 남아 있으면 envsubst가 안 돈 것이고,
`$uri`가 빈 칸으로 바뀌어 있으면 `NGINX_ENVSUBST_FILTER`가 안 걸린 것입니다.

**등록한 가게가 재배포 후 사라짐**
PVC가 안 붙었을 수 있습니다. `kubectl -n kopo14 get pvc`에서 `Bound`인지 보세요.
정상이라면 api 파드 로그 첫 줄이 `기존 /data/db.json 을 그대로 사용합니다`여야 합니다.
`초기 데이터를 복사합니다`가 나오면 볼륨이 새로 만들어진 것입니다.

**ArgoCD는 Healthy인데 브라우저가 "연결할 수 없음"**
클러스터는 멀쩡하고 port-forward만 끊긴 경우입니다. 위 4번 명령을 다시 실행하세요.
클러스터 안에서만 확인해 보려면:

```powershell
kubectl run t --rm -i --restart=Never --image=curlimages/curl -- curl -s -o /dev/null -w "%{http_code}\n" -H "Host: localhost" http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/api/restaurants
```

여기서 200이 나오면 앱은 정상이고 문제는 port-forward입니다.

**데이터를 초기 상태로 되돌리고 싶음**

```powershell
kubectl -n kopo14 delete pvc kopo14-api-data
kubectl -n kopo14 rollout restart deploy/kopo14-api
```

PVC를 지우면 ArgoCD가 다시 만들고, 빈 볼륨이라 이미지 속 `db.json`이 새로 복사됩니다.

---

## 알아 둘 것

- **네이버 시크릿은 브라우저로 나가지 않습니다.** nginx가 서버에서 헤더에 붙입니다.
  개발 서버에서 vite가 하던 일과 같습니다.
- **ArgoCD의 `selfHeal: true`** 때문에 `kubectl edit`으로 고쳐 봐야 곧 되돌아갑니다.
  바꾸려면 git을 고치세요. 그게 GitOps의 요점입니다.
- **json-server는 학습·시연용입니다.** 인증이 없어 주소만 알면 누구나 데이터를
  고칠 수 있습니다. 인터넷에 열어 둘 것이라면 진짜 백엔드로 바꿔야 합니다.
