# Profiles 场景配置指南

`profiles/` 目录下的 JSON 文件定义了不同 UI 场景的上下文配置。
`get_context_bundle` 工具根据这些配置，一次性返回 AI 生成代码所需的所有信息。

**新增场景只需新增一个 JSON 文件，不需要改任何代码。**

---

## 文件命名规则

文件名即 `uiType` 的值，小写英文，用于 AI 调用时传参。

```text
profiles/
  form.json     → uiType="form"
  table.json    → uiType="table"
  modal.json    → uiType="modal"
  navbar.json   → uiType="navbar"   ← 新增场景就这样加
```

---

## 字段说明

```jsonc
{
  // 必填。与文件名一致，小写英文
  "uiType": "form",

  // 必填。一句话说明这个场景是什么，会直接展示给 AI
  "description": "表单页面：用于数据录入、筛选、提交场景",

  // 必填。这个场景推荐使用的组件名列表（必须与 doc/index.json 中的 name 完全一致）
  // 工具会自动去拉这些组件的文档，按此顺序返回
  "components": ["Input", "Select", "Button"],

  // 必填。需要返回哪些类型的 Design Token
  // 可选值：color / spacing / radius / font / shadow
  // 只填这个场景真正用到的类型，减少不必要的 token 数量
  "tokenTypes": ["color", "spacing"],

  // 保留字段，当前版本未使用，填 ["rules", "props"] 即可
  "defaultSections": ["rules", "props"],

  // 必填。AI 生成代码时需要遵守的注意事项，逐条列出
  // 写法要求：
  //   - 每条一个具体规则，不要写模糊的废话
  //   - 直接说"做什么"或"不要做什么"
  //   - 涉及 prop 名称时用反引号包裹，如 `loading`
  //   - 涉及 token 时写完整变量名，如 `--md-color-error`
  //   - 建议 5-8 条，不要太多
  "checklist": [
    "表单字段需要绑定 value 和 onChange（受控组件）",
    "提交按钮使用 type=submit 或 onClick 触发校验",
    "加载状态用 Button `loading` prop，禁止重复提交",
    "错误提示文案放在字段下方，使用 `--md-color-error` token"
  ],

  // 必填。给 AI 的一句话实现建议，点出这个场景最容易踩的坑
  "hint": "生成表单代码时，优先使用受控组件模式，所有字段值统一用 state 管理"
}
```

---

## 新增场景步骤

1. 在 `src/profiles/` 下新建 `{uiType}.json`
2. 按上方字段说明填写内容
3. 确认 `components` 中的组件名在 `doc/index.json` 里都存在
4. 重新构建（`npm run build`）即可生效，无需改代码

---

## 常见问题

**Q：组件名写错了会怎样？**
A：工具会跳过找不到文档的组件，在结果里显示"文档暂未收录"。所以组件名必须和 `doc/index.json` 中的 `name` 字段完全一致（大小写敏感）。

**Q：checklist 和组件文档里的"核心规则"有什么区别？**
A：组件文档的核心规则是单个组件维度的，说的是"这个组件怎么用"。checklist 是场景维度的，说的是"在这个场景下多个组件怎么配合"。两者都会返回给 AI，不要重复。

**Q：tokenTypes 填什么？**
A：只填这个场景真正需要的类型。表单一般只需要 `color`、`spacing`；带阴影的弹窗加 `shadow`；需要圆角控制的加 `radius`。不要全填，会增加返回体积。

**Q：可用的 tokenTypes 有哪些？**
A：`color`、`spacing`、`radius`、`font`、`shadow`。具体 token 列表见 `doc/tokens/tokens.json`。
