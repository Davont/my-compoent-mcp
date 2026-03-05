---
name: RadioGroup
import: "import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';"
install: "npx shadcn@latest add radio-group"
category: form
status: stable
since: 0.1.0
aliases: [单选框, 单选组, Radio]
keywords: [单选, 互斥, 选择, radio, option, 选项, exclusive]
dependencies: ["@base-ui/react"]
tokens: [--primary, --border, --ring]
source: "components/ui/radio-group.tsx"
---

# RadioGroup

单选组组件，从一组互斥选项中选择一个值。基于 Base UI Radio Group 封装。

---

## 核心规则（AI 生成时必读）

- **组合结构**：**必须**使用 `RadioGroup` → 多个 `RadioGroupItem`（各自配 Label）的结构。
- **每项必须关联 Label**：每个 `RadioGroupItem` **必须**通过 `<Label htmlFor>` 或 `<FieldLabel htmlFor>` 关联标签，**禁止**裸写无标签的 RadioGroupItem。
- **配合 Field 布局**：每个 RadioGroupItem + Label **建议**用 `<Field orientation="horizontal">` 包裹，获得统一水平对齐。
- **defaultValue 必填**：**必须**设置 `defaultValue` 指定默认选中项，避免初始无选中状态。
- **适用范围**：选项为 2-5 个时用 RadioGroup，超过 5 个**应使用** `Select`。
- **组标题**：一组 RadioGroup **建议**用 `<FieldSet>` + `<FieldLegend>` 包裹，提供组标题和描述。
- **禁用项样式**：单个 RadioGroupItem `disabled` 时，**必须**在对应 `<Field>` 上设置 `data-disabled`。

---

## 子组件结构

| 子组件 | 说明 | 必须 |
|--------|------|:----:|
| RadioGroup | 根容器，管理选中状态 | ✅ |
| RadioGroupItem | 单个单选项 | ✅ |

---

## Props

### RadioGroup

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| defaultValue | `string` | ✅ | | 默认选中值 |
| value | `string` | | | 受控选中值 |
| onValueChange | `(value: string) => void` | | | 选中值变化回调 |
| name | `string` | | | 表单字段名 |
| orientation | `"horizontal" \| "vertical"` | | `"vertical"` | 排列方向 |
| disabled | `boolean` | | `false` | 禁用整组 |
| className | `string` | | | 自定义类名 |

### RadioGroupItem

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `string` | ✅ | | 选项值 |
| id | `string` | ✅ | | 元素 ID，关联 Label |
| disabled | `boolean` | | `false` | 禁用该选项 |

---

## Examples

### 基础用法

```tsx
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Demo = () => (
  <RadioGroup defaultValue="comfortable" className="w-fit">
    <div className="flex items-center gap-3">
      <RadioGroupItem value="default" id="r1" />
      <Label htmlFor="r1">默认</Label>
    </div>
    <div className="flex items-center gap-3">
      <RadioGroupItem value="comfortable" id="r2" />
      <Label htmlFor="r2">舒适</Label>
    </div>
    <div className="flex items-center gap-3">
      <RadioGroupItem value="compact" id="r3" />
      <Label htmlFor="r3">紧凑</Label>
    </div>
  </RadioGroup>
);
```

### 配合 Field + 描述文字

```tsx
import {
  Field, FieldContent, FieldDescription, FieldLabel,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Demo = () => (
  <RadioGroup defaultValue="comfortable" className="w-fit">
    <Field orientation="horizontal">
      <RadioGroupItem value="default" id="desc-r1" />
      <FieldContent>
        <FieldLabel htmlFor="desc-r1">默认</FieldLabel>
        <FieldDescription>适合大多数场景的标准间距。</FieldDescription>
      </FieldContent>
    </Field>
    <Field orientation="horizontal">
      <RadioGroupItem value="comfortable" id="desc-r2" />
      <FieldContent>
        <FieldLabel htmlFor="desc-r2">舒适</FieldLabel>
        <FieldDescription>更宽松的元素间距。</FieldDescription>
      </FieldContent>
    </Field>
    <Field orientation="horizontal">
      <RadioGroupItem value="compact" id="desc-r3" />
      <FieldContent>
        <FieldLabel htmlFor="desc-r3">紧凑</FieldLabel>
        <FieldDescription>适合信息密集的布局。</FieldDescription>
      </FieldContent>
    </Field>
  </RadioGroup>
);
```

### 卡片选择样式

用 FieldLabel 包裹整个 Field 实现可点击的卡片式选项。

```tsx
import {
  Field, FieldContent, FieldDescription,
  FieldLabel, FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Demo = () => (
  <RadioGroup defaultValue="pro" className="max-w-sm">
    <FieldLabel htmlFor="plan-basic">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>基础版</FieldTitle>
          <FieldDescription>适合个人用户，¥9.9/月</FieldDescription>
        </FieldContent>
        <RadioGroupItem value="basic" id="plan-basic" />
      </Field>
    </FieldLabel>
    <FieldLabel htmlFor="plan-pro">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>专业版</FieldTitle>
          <FieldDescription>适合团队协作，¥29.9/月</FieldDescription>
        </FieldContent>
        <RadioGroupItem value="pro" id="plan-pro" />
      </Field>
    </FieldLabel>
    <FieldLabel htmlFor="plan-enterprise">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>企业版</FieldTitle>
          <FieldDescription>大型团队，定制化方案</FieldDescription>
        </FieldContent>
        <RadioGroupItem value="enterprise" id="plan-enterprise" />
      </Field>
    </FieldLabel>
  </RadioGroup>
);
```

### 配合 FieldSet 分组

```tsx
import {
  Field, FieldDescription, FieldLabel,
  FieldLegend, FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Demo = () => (
  <FieldSet className="w-full max-w-xs">
    <FieldLegend variant="label">订阅周期</FieldLegend>
    <FieldDescription>年度和终身方案可享受更多优惠。</FieldDescription>
    <RadioGroup defaultValue="monthly">
      <Field orientation="horizontal">
        <RadioGroupItem value="monthly" id="plan-monthly" />
        <FieldLabel htmlFor="plan-monthly" className="font-normal">
          月付（¥9.9/月）
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem value="yearly" id="plan-yearly" />
        <FieldLabel htmlFor="plan-yearly" className="font-normal">
          年付（¥99/年，省 17%）
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem value="lifetime" id="plan-lifetime" />
        <FieldLabel htmlFor="plan-lifetime" className="font-normal">
          终身（¥299，一次买断）
        </FieldLabel>
      </Field>
    </RadioGroup>
  </FieldSet>
);
```

### 禁用选项

```tsx
import { Field, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Demo = () => (
  <RadioGroup defaultValue="option2" className="w-fit">
    <Field orientation="horizontal" data-disabled>
      <RadioGroupItem value="option1" id="dis-1" disabled />
      <FieldLabel htmlFor="dis-1" className="font-normal">
        选项一（不可用）
      </FieldLabel>
    </Field>
    <Field orientation="horizontal">
      <RadioGroupItem value="option2" id="dis-2" />
      <FieldLabel htmlFor="dis-2" className="font-normal">选项二</FieldLabel>
    </Field>
    <Field orientation="horizontal">
      <RadioGroupItem value="option3" id="dis-3" />
      <FieldLabel htmlFor="dis-3" className="font-normal">选项三</FieldLabel>
    </Field>
  </RadioGroup>
);
```

---

## Behavior

- **互斥选择**：同一 RadioGroup 内只能选中一个 RadioGroupItem。
- **点击切换**：点击 RadioGroupItem 或其关联 Label 选中。
- **键盘导航**：上下箭头（垂直模式）或左右箭头（水平模式）在选项间移动并自动选中。
- **focus**：Tab 聚焦到 RadioGroup 中当前选中项（或第一项），箭头键在选项间切换。
- **disabled**：整组 `disabled` 后全部不可选；单项 `disabled` 后该项不可选但其他正常。

---

## When to use

**适用**：

- 2-5 个互斥选项需要全部可见（如订阅方案、排列密度、主题选择）。
- 需要用户明确看到所有可选项再做决定。

**不适用**：

- **超过 5 个选项** → 用 `Select`，节省空间。
- **多选** → 用 `Checkbox`。
- **布尔开关** → 用 `Switch` 或 `Checkbox`。

---

## Accessibility

- **键盘**：Tab 聚焦到 RadioGroup，箭头键在选项间导航并自动选中。
- **ARIA**：RadioGroup `role="radiogroup"`，RadioGroupItem `role="radio"` + `aria-checked`。
- **标签关联**：每项通过 `id` + `htmlFor` 关联 Label。

---

## Related

- `Checkbox`：多选场景用 Checkbox，互斥单选用 RadioGroup。
- `Select`：选项超过 5 个时用 Select 节省空间。
- `Switch`：布尔开关场景用 Switch，RadioGroup 适合 3 个及以上互斥选项。
- `Field`：推荐用 Field 包裹每个 RadioGroupItem + Label。
- `Form`：表单场景配合 React Hook Form 使用。
