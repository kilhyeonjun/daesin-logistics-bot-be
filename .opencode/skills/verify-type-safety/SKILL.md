---
name: verify-type-safety
description: TypeScript 타입 안전성을 검증합니다. as any, @ts-ignore, 빈 catch 블록 등 타입 억제 패턴을 탐지합니다. 코드 변경 후 사용.
---

# 타입 안전성 검증

## Purpose

1. **`as any` 금지** — 타입 단언 `as any`가 사용되지 않는지 검증
2. **`@ts-ignore` 금지** — TypeScript 에러를 무시하는 `@ts-ignore` 주석이 없는지 검증
3. **`@ts-expect-error` 금지** — `@ts-expect-error` 주석이 없는지 검증
4. **빈 catch 블록 금지** — `catch(e) {}` 같은 빈 에러 핸들링이 없는지 검증
5. **도메인 에러 클래스 사용** — 에러를 throw할 때 `DomainError` 하위 클래스를 사용하는지 검증

## When to Run

- TypeScript 코드를 수정한 후
- 에러 핸들링 코드를 추가한 후
- 새 기능을 구현한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/shared/errors/DomainError.ts` | 도메인 에러 클래스 정의 (ValidationError, NotFoundError, CrawlingError) |
| `src/domain/value-objects/LineCode.ts` | ValidationError 사용 예시 |
| `src/domain/value-objects/SearchDate.ts` | ValidationError 사용 예시 |
| `src/domain/value-objects/YearMonth.ts` | ValidationError 사용 예시 |
| `src/interface/http/controllers/RouteController.ts` | 컨트롤러 에러 핸들링 패턴 예시 |
| `src/interface/http/controllers/SyncController.ts` | 컨트롤러 에러 핸들링 패턴 예시 |
| `src/interface/http/controllers/AuthController.ts` | 컨트롤러 에러 핸들링 패턴 예시 |
| `tsconfig.json` | strict: true 설정 |

## Workflow

### Step 1: `as any` 탐지

**검사:** `src/` 내 모든 TypeScript 파일에서 `as any` 타입 단언이 사용되지 않는지 확인합니다.

**도구:** Grep

```
pattern: "as any"
include: "*.ts"
path: "src"
```

**PASS:** `as any` 사용 0건.

**FAIL:** `as any`가 발견된 경우.

**수정:** 올바른 타입을 지정하거나, 타입 가드를 사용하거나, 제네릭을 활용합니다. 예:
- `JSON.parse(data) as any` → `JSON.parse(data) as SomeType`
- `obj as any as OtherType` → 타입 변환 함수 작성

### Step 2: `@ts-ignore` 탐지

**검사:** `src/` 내 모든 TypeScript 파일에서 `@ts-ignore` 주석이 없는지 확인합니다.

**도구:** Grep

```
pattern: "@ts-ignore"
include: "*.ts"
path: "src"
```

**PASS:** `@ts-ignore` 사용 0건.

**FAIL:** `@ts-ignore`가 발견된 경우.

**수정:** TypeScript 에러의 근본 원인을 해결합니다. 타입 정의를 수정하거나, 올바른 타입을 추가합니다.

### Step 3: `@ts-expect-error` 탐지

**검사:** `src/` 내 모든 TypeScript 파일에서 `@ts-expect-error` 주석이 없는지 확인합니다.

**도구:** Grep

```
pattern: "@ts-expect-error"
include: "*.ts"
path: "src"
```

**PASS:** `@ts-expect-error` 사용 0건.

**FAIL:** `@ts-expect-error`가 발견된 경우.

**수정:** TypeScript 에러의 근본 원인을 해결합니다.

### Step 4: 빈 catch 블록 탐지

**검사:** `src/` 내 모든 TypeScript 파일에서 빈 catch 블록이 없는지 확인합니다.

**도구:** AST-grep

```
pattern: "try { $$$ } catch ($ERR) { }"
lang: typescript
paths: ["src"]
```

**PASS:** 빈 catch 블록 0건.

**FAIL:** 빈 catch 블록이 발견된 경우.

**수정:** catch 블록에 적절한 에러 핸들링을 추가합니다:
```typescript
// 컨트롤러에서:
catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  res.status(500).json({ success: false, error: message });
}

// 유스케이스에서:
catch (error) {
  throw new CrawlingError(`Failed: ${error instanceof Error ? error.message : 'unknown'}`);
}
```

### Step 5: 컨트롤러 에러 핸들링 패턴 확인

**검사:** `src/interface/` 내 컨트롤러의 catch 블록이 표준 에러 응답 패턴을 따르는지 확인합니다. 표준 패턴: `error instanceof Error ? error.message : 'Unknown error'`

**도구:** Grep

```
pattern: "catch \\(error\\)"
include: "*.ts"
path: "src/interface"
```

각 매칭 위치에서 Read로 해당 catch 블록의 내용을 확인합니다.

**PASS:** 모든 컨트롤러 catch 블록이 `error instanceof Error ? error.message : 'Unknown error'` 패턴을 사용.

**FAIL:** 다른 에러 핸들링 패턴을 사용하는 경우.

**수정:** 표준 에러 응답 패턴으로 변경합니다:
```typescript
const message = error instanceof Error ? error.message : 'Unknown error';
res.status(500).json({ success: false, error: message });
```

## Output Format

```markdown
| # | 검사 | 상태 | 위반 위치 |
|---|------|------|-----------|
| 1 | as any 금지 | PASS/FAIL | 파일:라인 목록 |
| 2 | @ts-ignore 금지 | PASS/FAIL | 파일:라인 목록 |
| 3 | @ts-expect-error 금지 | PASS/FAIL | 파일:라인 목록 |
| 4 | 빈 catch 블록 금지 | PASS/FAIL | 파일:라인 목록 |
| 5 | 컨트롤러 에러 패턴 | PASS/FAIL | 파일:라인 목록 |
```

## Exceptions

1. **테스트 파일** — `tests/` 디렉토리와 `__tests__/` 디렉토리 내 파일에서의 `as any`는 테스트 목적으로 허용될 수 있음
2. **타입 정의 파일** — `.d.ts` 파일에서의 타입 관련 패턴은 면제
3. **`as string` 등 구체적 타입 단언** — `as any`만 금지이며, `as string`, `as number` 같은 구체적 타입 단언은 맥락에 따라 허용
