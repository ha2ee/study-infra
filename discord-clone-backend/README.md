# Discord Clone Backend

이 프로젝트는 Discord와 유사한 실시간 채팅 애플리케이션의 백엔드입니다. Docker와 Kubernetes(Minikube)를 사용하여 컨테이너화 및 배포를 학습할 수 있도록 설계되었습니다.

## 📋 목차

1. 프로젝트 개요
2. 기술 스택
3. 로컬 개발 환경 설정
4. Docker로 배포하기
5. Kubernetes(Minikube)로 배포하기
6. CI/CD 파이프라인

---

## 1. 프로젝트 개요

이 애플리케이션은 Socket.IO를 사용하여 실시간 채팅 기능을 제공합니다. 사용자는 여러 채팅방에 참여하여 메시지를 주고받을 수 있으며, MongoDB에 메시지가 저장됩니다.

### 주요 기능

- 실시간 채팅
- 다양한 채팅방 지원
- 메시지 영구 저장
- 채팅방 입장 시 이전 메시지 로드

---

## 2. 기술 스택

- **백엔드**: Node.js, Express
- **데이터베이스**: MongoDB
- **실시간 통신**: Socket.IO
- **컨테이너화**: Docker, Docker Compose
- **오케스트레이션**: Kubernetes (Minikube)
- **CI/CD**: GitHub Actions

---

## 3. 로컬 개발 환경 설정

### 필수 요구사항

- Node.js v22 이상
- MongoDB
- Git

### 설치 및 실행

```bash
# 레포지토리 클론
git clone <repository-url>
cd discord-clone-backend

# 종속성 설치
npm install

# 애플리케이션 실행
node server.js
```

서버는 기본적으로 http://localhost:5000 에서 실행됩니다. 브라우저에서 이 주소로 접속하여 `public/test.html` 페이지로 채팅 기능을 테스트할 수 있습니다.

---

## 4. Docker로 배포하기

### Docker 설정

#### Dockerfile

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

#### Docker Compose

```yaml
version: "3"
services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/chat
    depends_on:
      - mongodb
    restart: always
    volumes:
      - ./public:/app/public

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

### Docker 명령어

```bash
# Docker Compose로 서비스 실행
docker-compose up -d

# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs

# 서비스 중지
docker-compose down
```

---

## 5. Kubernetes(Minikube)로 배포하기

### Minikube 설치 (Windows)

```powershell
# PowerShell 관리자 권한으로 실행
winget install Kubernetes.minikube
winget install Kubernetes.kubectl

# Minikube 시작
minikube start --driver=docker
```

### Kubernetes 매니페스트 파일

#### MongoDB Deployment 및 Service

```yaml
# mongodb-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo:latest
          ports:
            - containerPort: 27017
          volumeMounts:
            - name: mongodb-data
              mountPath: /data/db
      volumes:
        - name: mongodb-data
          emptyDir: {}
```

```yaml
# mongodb-service.yml
apiVersion: v1
kind: Service
metadata:
  name: mongo-service
spec:
  selector:
    app: mongodb
  ports:
    - port: 27017
      targetPort: 27017
```

#### Discord Backend Deployment 및 Service

```yaml
# discord-backend-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: discord-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: discord-backend
  template:
    metadata:
      labels:
        app: discord-backend
    spec:
      containers:
        - name: discord-backend
          image: discord-clone-backend:latest
          imagePullPolicy: Never
          ports:
            - containerPort: 5000
          env:
            - name: MONGODB_URI
              value: mongodb://mongo-service:27017/chat
```

```yaml
# discord-backend-service.yml
apiVersion: v1
kind: Service
metadata:
  name: discord-backend-service
spec:
  selector:
    app: discord-backend
  ports:
    - port: 5000
      targetPort: 5000
  type: NodePort
```

### Kubernetes 배포 단계

```bash
# 1. 이미지 빌드 및 Minikube로 로드
# Minikube Docker 환경 설정 (PowerShell)
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

# 이미지 빌드
docker build -t discord-clone-backend:latest .

# 2. MongoDB 배포
kubectl apply -f kubernetes/mongodb-deployment.yml
kubectl apply -f kubernetes/mongodb-service.yml

# 3. Discord 백엔드 배포
kubectl apply -f kubernetes/discord-backend-deployment.yml
kubectl apply -f kubernetes/discord-backend-service.yml

# 4. 배포 상태 확인
kubectl get pods
kubectl get services

# 5. 서비스에 접근
minikube service discord-backend-service
```

---

## 6. CI/CD 파이프라인

GitHub Actions를 사용한 CI/CD 파이프라인이 구성되어 있습니다. 이 파이프라인은 main 브랜치로의 푸시나 PR 시 자동으로 실행됩니다.

```yaml
name: Discord Clone CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "22"

      - name: Install dependencies
        working-directory: ./discord-clone-backend
        run: npm install

      - name: Build Docker image
        working-directory: ./discord-clone-backend
        run: docker build -t discord-clone-backend .
```

---

## 주의사항 및 문제 해결

1. **이미지 로드 문제**: Minikube에서 `ErrImagePull` 오류가 발생할 경우, Minikube의 Docker 환경에서 이미지를 직접 빌드하고 `imagePullPolicy: Never`로 설정해야 합니다.

2. **네트워크 연결 확인**: MongoDB에 접근하려면 `mongo-service`로 설정된 네트워크가 올바르게 연결되어 있는지 확인이 필요합니다.

3. **볼륨 데이터 관리**: Minikube를 재시작하면 `emptyDir` 볼륨의 데이터가 손실될 수 있습니다. 중요한 데이터는 PersistentVolumeClaim을 사용하여 보존하는 것이 좋습니다.

---

이 프로젝트는 Discord와 같은 실시간 채팅 애플리케이션의 백엔드를 구현하고, 최신 DevOps 도구와 실천 방법을 학습하기 위한 실습 프로젝트입니다.
