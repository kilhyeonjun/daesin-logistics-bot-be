# Terraform - OCI Free Tier 배포

Oracle Cloud Infrastructure (OCI) Free Tier에 logistics-bot을 배포하기 위한 Terraform 구성입니다.

## 사전 요구사항

### 1. OCI 계정 설정

1. [Oracle Cloud](https://cloud.oracle.com/) 계정 생성
2. OCI Console → Profile → API Keys에서 API 키 생성
3. 생성된 설정 정보 저장:
   - Tenancy OCID
   - User OCID
   - Fingerprint
   - Private Key 파일 경로

### 2. 로컬 환경

```bash
# Terraform 설치 (macOS)
brew install terraform

# OCI CLI 설치 (선택사항)
brew install oci-cli
```

## 배포 방법

### 1. 변수 파일 설정

```bash
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars` 편집:
```hcl
tenancy_ocid     = "ocid1.tenancy.oc1..실제값"
user_ocid        = "ocid1.user.oc1..실제값"
fingerprint      = "aa:bb:cc:..."
private_key_path = "~/.oci/oci_api_key.pem"
region           = "ap-chuncheon-1"
```

### 2. Terraform 초기화 및 배포

```bash
cd infra/terraform

# 초기화
terraform init

# 계획 확인
terraform plan

# 배포
terraform apply
```

### 3. ARM 인스턴스 용량 부족 시

Free Tier ARM 인스턴스는 용량이 자주 부족합니다. 자동 재시도 스크립트 사용:

```bash
chmod +x retry-apply.sh
./retry-apply.sh
```

5분 간격으로 최대 24시간 동안 자동 재시도합니다.

## 배포 후 설정

### 1. SSH 접속

```bash
# Terraform output 확인
terraform output ssh_command

# 접속
ssh -i ~/.ssh/id_rsa ubuntu@<PUBLIC_IP>
```

### 2. Cloud-init 완료 확인

```bash
# 완료 표시 파일 확인
ls -la ~/.cloud-init-complete

# 또는 로그 확인
sudo tail -f /var/log/cloud-init-output.log
```

### 3. 애플리케이션 배포

```bash
# 코드 클론
git clone https://github.com/your-repo/logistics-bot.git
cd logistics-bot

# 의존성 설치
npm install

# 빌드
npm run build

# PM2로 실행
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 인스턴스 사양

| 항목 | 값 |
|------|-----|
| Shape | VM.Standard.A1.Flex (ARM) |
| OCPU | 2 (최대 4) |
| Memory | 12 GB (최대 24 GB) |
| Boot Volume | 50 GB |
| OS | Ubuntu 22.04 LTS (ARM) |

## 네트워크 구성

| 포트 | 용도 |
|------|------|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS |
| 3000 | App (카카오톡 스킬 서버) |

## 비용

**Always Free** 범위 내:
- ARM 인스턴스: 4 OCPU, 24GB RAM 총량까지 무료
- Boot Volume: 200GB 총량까지 무료
- Network: 10TB/월 아웃바운드 무료

## 삭제

```bash
terraform destroy
```

## 문제 해결

### "Out of host capacity" 에러

ARM 인스턴스 용량 부족입니다. `retry-apply.sh` 스크립트로 자동 재시도하거나:

1. 다른 리전 시도 (us-phoenix-1 권장)
2. 리소스 축소 (OCPU: 1, Memory: 6GB)
3. 시간대 변경 (새벽 시간대 시도)

### Terraform state 문제

```bash
# State 확인
terraform state list

# 특정 리소스 제거
terraform state rm <resource_name>
```

## 참고

- [OCI Free Tier](https://www.oracle.com/cloud/free/)
- [Terraform OCI Provider](https://registry.terraform.io/providers/oracle/oci/latest/docs)
