# Zero-Downtime Deployment with Docker Rollout

## TL;DR

> **Quick Summary**: Configure Docker Rollout plugin for zero-downtime deployments by removing the container_name constraint and creating a deployment script.
> 
> **Deliverables**:
> - Modified docker-compose.yml (without container_name)
> - `scripts/deploy.sh` executable script
> - Updated README.md with deployment instructions
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 4 (all others can parallel)

---

## Context

### Original Request
Implement zero-downtime deployment using Docker Rollout plugin for the daesin-logistics-bot-be project. Current deployment (`docker compose down && up --build`) causes downtime.

### Interview Summary
**Key Discussions**:
- User provided exact plugin installation command for macOS
- `container_name` must be removed to allow Docker to manage replicas
- Deploy script should be simple: build → rollout
- README should include plugin installation + usage

**Research Findings**:
- docker-compose.yml line 4 has `container_name: daesin-logistics-bot` (must remove)
- Dockerfile already has healthcheck configured (required for rolling updates)
- `~/.docker/cli-plugins` directory exists on macOS
- README has existing "Docker 운영" section at lines 237-262

### Self-Review Gap Analysis
**Identified Gaps** (addressed):
- Healthcheck confirmation: Verified Dockerfile has proper healthcheck ✓
- CLI plugins path: Confirmed `~/.docker/cli-plugins` exists ✓
- Plugin binary architecture: User specified `darwin` filter for macOS ✓

---

## Work Objectives

### Core Objective
Enable zero-downtime deployments by configuring Docker Rollout plugin and creating automation scripts.

### Concrete Deliverables
- `docker-compose.yml` without `container_name` directive
- `scripts/deploy.sh` executable shell script
- Updated `README.md` with "Zero-Downtime Deployment" section

### Definition of Done
- [ ] `docker compose config` shows no `container_name` for app service
- [ ] `scripts/deploy.sh` exists and is executable (`-x` permission)
- [ ] README contains Docker Rollout installation and usage instructions
- [ ] `docker rollout --help` shows plugin is installed (verification step)

### Must Have
- Remove `container_name: daesin-logistics-bot` from docker-compose.yml
- Create executable deploy.sh with proper shebang and error handling
- Document plugin installation for macOS

### Must NOT Have (Guardrails)
- Do NOT add nginx/reverse proxy configuration (out of scope)
- Do NOT modify the Dockerfile (healthcheck already configured)
- Do NOT change port mappings or environment variables
- Do NOT add CI/CD pipeline configuration
- Do NOT modify any other docker-compose.yml settings besides container_name

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (shell scripts, not application code)
- **User wants tests**: Manual verification via commands
- **Framework**: N/A
- **QA approach**: Automated verification via bash commands

### Automated Verification Procedures

Each task includes executable verification that agents can run directly using Bash commands.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Remove container_name from docker-compose.yml (no dependencies)
├── Task 2: Create scripts/deploy.sh (no dependencies)
└── Task 3: Update README.md with deployment instructions (no dependencies)

Wave 2 (After Wave 1 completes):
└── Task 4: Verify complete implementation (depends: 1, 2, 3)

Critical Path: Task 1 → Task 4 (for rollout verification)
Parallel Speedup: ~60% faster than sequential (3 tasks in parallel)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4 | 2, 3 |
| 2 | None | 4 | 1, 3 |
| 3 | None | 4 | 1, 2 |
| 4 | 1, 2, 3 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | delegate_task(category="quick", run_in_background=true) × 3 |
| 2 | 4 | delegate_task(category="quick", run_in_background=false) |

---

## TODOs

- [ ] 1. Remove container_name from docker-compose.yml

  **What to do**:
  - Open `docker-compose.yml`
  - Remove line 4: `container_name: daesin-logistics-bot`
  - Ensure no trailing whitespace or empty lines are introduced

  **Must NOT do**:
  - Do NOT modify any other lines in the file
  - Do NOT change ports, volumes, environment, or healthcheck
  - Do NOT add any new configuration

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line deletion in a single file, trivial task
  - **Skills**: `[]`
    - No specialized skills needed for simple file edit

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: Not TypeScript code
  - `git-master`: Not a commit task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None (can start immediately)

  **References**:
  
  **File Reference** (target file):
  - `docker-compose.yml:4` - Line to remove: `container_name: daesin-logistics-bot`
  
  **Documentation Reference**:
  - Docker Rollout README: `container_name` prevents Docker from creating multiple instances

  **WHY Each Reference Matters**:
  - Line 4 is the exact location to modify, preventing any confusion

  **Acceptance Criteria**:

  **Automated Verification** (using Bash):
  ```bash
  # Agent runs:
  grep -c "container_name" docker-compose.yml
  # Assert: Output is "0" (no container_name found)
  
  docker compose config --services
  # Assert: Output contains "app"
  # Assert: Exit code 0 (valid compose file)
  ```

  **Evidence to Capture**:
  - [ ] Output of `grep -c "container_name" docker-compose.yml` showing "0"
  - [ ] Output of `docker compose config` showing valid YAML

  **Commit**: YES (groups with 2, 3)
  - Message: `chore(docker): enable zero-downtime deployment with rollout plugin`
  - Files: `docker-compose.yml`, `scripts/deploy.sh`, `README.md`
  - Pre-commit: `docker compose config --quiet`

---

- [ ] 2. Create scripts/deploy.sh

  **What to do**:
  - Create file `scripts/deploy.sh`
  - Add shebang: `#!/usr/bin/env bash`
  - Add `set -euo pipefail` for error handling
  - Add descriptive comments
  - Implement: git pull → docker compose build → docker rollout app
  - Make executable with `chmod +x`

  **Script content**:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  # Zero-downtime deployment using Docker Rollout
  # Prerequisites: Docker Rollout plugin installed
  # Usage: ./scripts/deploy.sh

  echo "🚀 Starting zero-downtime deployment..."

  # Pull latest changes
  echo "📥 Pulling latest code..."
  git pull

  # Build new image
  echo "🔨 Building new image..."
  docker compose build

  # Rolling update (zero-downtime)
  echo "🔄 Performing rolling update..."
  docker rollout app

  echo "✅ Deployment complete!"
  ```

  **Must NOT do**:
  - Do NOT use `docker compose down` (defeats purpose)
  - Do NOT hardcode paths
  - Do NOT include sensitive information

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple shell script creation, ~15 lines
  - **Skills**: `[]`
    - No specialized skills needed for basic bash script

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: Not TypeScript code
  - `python-programmer`: Not Python code

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern Reference** (existing scripts directory):
  - `scripts/` directory - Location for script, contains existing TypeScript scripts
  
  **Documentation Reference**:
  - Docker Rollout GitHub: `docker rollout <service>` performs rolling update

  **WHY Each Reference Matters**:
  - Scripts directory already exists, maintaining project structure consistency

  **Acceptance Criteria**:

  **Automated Verification** (using Bash):
  ```bash
  # Agent runs:
  test -f scripts/deploy.sh && echo "exists"
  # Assert: Output is "exists"
  
  test -x scripts/deploy.sh && echo "executable"
  # Assert: Output is "executable"
  
  head -1 scripts/deploy.sh
  # Assert: Output is "#!/usr/bin/env bash"
  
  grep -c "docker rollout" scripts/deploy.sh
  # Assert: Output is "1" (contains rollout command)
  ```

  **Evidence to Capture**:
  - [ ] Output of `ls -la scripts/deploy.sh` showing executable permission
  - [ ] Output of `cat scripts/deploy.sh` showing correct content

  **Commit**: YES (groups with 1, 3)
  - Message: `chore(docker): enable zero-downtime deployment with rollout plugin`
  - Files: `docker-compose.yml`, `scripts/deploy.sh`, `README.md`
  - Pre-commit: `bash -n scripts/deploy.sh`

---

- [ ] 3. Update README.md with deployment instructions

  **What to do**:
  - Locate "Docker 운영" section (around line 237)
  - Add new subsection "### Zero-Downtime Deployment (무중단 배포)"
  - Include:
    1. Plugin installation command for macOS
    2. Usage instructions with `./scripts/deploy.sh`
    3. Manual rollout command: `docker rollout app`
  - Maintain Korean language consistency with existing README

  **Content to add** (after line 256, before "### 데이터 백업"):
  ```markdown
  ### Zero-Downtime Deployment (무중단 배포)

  Docker Rollout 플러그인을 사용하여 다운타임 없이 배포할 수 있습니다.

  #### 플러그인 설치 (macOS)

  ```bash
  curl -s https://api.github.com/repos/wowu/docker-rollout/releases/latest \
    | grep browser_download_url \
    | cut -d '"' -f 4 \
    | grep darwin \
    | xargs curl -sL \
    | tar xz -C ~/.docker/cli-plugins
  ```

  #### 배포 명령어

  ```bash
  # 자동 배포 스크립트 실행
  ./scripts/deploy.sh

  # 또는 수동 실행
  docker compose build
  docker rollout app
  ```

  > **참고**: 롤링 업데이트 중 healthcheck를 통해 새 컨테이너가 정상 응답할 때까지 기존 컨테이너가 유지됩니다.
  ```

  **Must NOT do**:
  - Do NOT remove or modify existing content
  - Do NOT change the document structure
  - Do NOT add content unrelated to deployment

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding markdown section to existing file, straightforward edit
  - **Skills**: `[]`
    - No specialized skills needed for markdown editing

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: Not UI work
  - `typescript-programmer`: Not code

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4
  - **Blocked By**: None (can start immediately)

  **References**:

  **File Reference** (insert location):
  - `README.md:256` - Insert after "업데이트 배포" section, before "데이터 백업"
  
  **Pattern Reference** (existing style):
  - `README.md:237-262` - "Docker 운영" section style to match

  **WHY Each Reference Matters**:
  - Line 256 is exact insertion point after current update command
  - Existing section shows formatting/language conventions to follow

  **Acceptance Criteria**:

  **Automated Verification** (using Bash):
  ```bash
  # Agent runs:
  grep -c "Zero-Downtime Deployment" README.md
  # Assert: Output is "1"
  
  grep -c "docker rollout" README.md
  # Assert: Output >= "1"
  
  grep -c "docker-rollout/releases" README.md
  # Assert: Output is "1" (plugin installation documented)
  ```

  **Evidence to Capture**:
  - [ ] Output of grep commands showing content exists
  - [ ] Section of README showing new content in context

  **Commit**: YES (groups with 1, 2)
  - Message: `chore(docker): enable zero-downtime deployment with rollout plugin`
  - Files: `docker-compose.yml`, `scripts/deploy.sh`, `README.md`
  - Pre-commit: N/A

---

- [ ] 4. Verify complete implementation

  **What to do**:
  - Run all verification commands to confirm implementation
  - Test that `docker compose config` is valid
  - Verify deploy script is executable
  - Confirm README has new section
  - (Optional) Test `docker rollout --help` if plugin is installed

  **Must NOT do**:
  - Do NOT actually run `docker rollout app` (would require running containers)
  - Do NOT make any changes, only verify

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification-only task, running shell commands
  - **Skills**: `[]`
    - No specialized skills needed for running verification commands

  **Skills Evaluated but Omitted**:
  - All skills: This is pure verification, no domain expertise needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential, after Wave 1)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 2, 3

  **References**:

  **File References** (files to verify):
  - `docker-compose.yml` - Should not contain `container_name`
  - `scripts/deploy.sh` - Should exist and be executable
  - `README.md` - Should contain "Zero-Downtime Deployment" section

  **WHY Each Reference Matters**:
  - Each file is a deliverable that must be verified

  **Acceptance Criteria**:

  **Automated Verification** (using Bash):
  ```bash
  # Verify docker-compose.yml
  ! grep -q "container_name" docker-compose.yml && echo "✅ container_name removed"
  docker compose config --quiet && echo "✅ valid compose file"
  
  # Verify deploy script
  test -x scripts/deploy.sh && echo "✅ deploy.sh is executable"
  bash -n scripts/deploy.sh && echo "✅ deploy.sh has valid syntax"
  
  # Verify README
  grep -q "Zero-Downtime Deployment" README.md && echo "✅ README updated"
  grep -q "docker rollout" README.md && echo "✅ rollout command documented"
  
  # Verify plugin installation docs
  grep -q "docker-rollout/releases" README.md && echo "✅ plugin install documented"
  
  # (Optional) Check if plugin is installed
  docker rollout --help > /dev/null 2>&1 && echo "✅ plugin installed" || echo "⚠️ plugin not yet installed (expected)"
  ```

  **Evidence to Capture**:
  - [ ] All verification outputs showing success
  - [ ] Final state of all modified files

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1, 2, 3 (grouped) | `chore(docker): enable zero-downtime deployment with rollout plugin` | docker-compose.yml, scripts/deploy.sh, README.md | `docker compose config --quiet && bash -n scripts/deploy.sh` |

---

## Success Criteria

### Verification Commands
```bash
# 1. No container_name in docker-compose.yml
grep -c "container_name" docker-compose.yml  # Expected: 0

# 2. Deploy script exists and is executable  
ls -la scripts/deploy.sh  # Expected: -rwxr-xr-x permissions
bash -n scripts/deploy.sh  # Expected: no syntax errors

# 3. README contains deployment docs
grep "Zero-Downtime Deployment" README.md  # Expected: match found
grep "docker rollout" README.md  # Expected: match found

# 4. Docker compose file is valid
docker compose config --quiet  # Expected: exit code 0
```

### Final Checklist
- [ ] docker-compose.yml has NO `container_name` directive
- [ ] scripts/deploy.sh exists with executable permissions
- [ ] scripts/deploy.sh contains `docker rollout app` command
- [ ] README.md has "Zero-Downtime Deployment" section
- [ ] README.md documents macOS plugin installation
- [ ] All files have valid syntax
