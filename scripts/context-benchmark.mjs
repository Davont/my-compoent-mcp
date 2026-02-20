#!/usr/bin/env node

/**
 * 上下文控量基准测试
 *
 * 量化验证：MCP 工具的分层查询到底能减少多少上下文量
 *
 * 运行方式：node scripts/context-benchmark.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ============ 动态 import 构建产物 ============

const dist = join(ROOT, 'dist/index.js');
if (!existsSync(dist)) {
  console.error('❌ 请先运行 npm run build');
  process.exit(1);
}

const mod = await import(dist);

const {
  handleComponentList,
  handleComponentSearch,
  handleComponentDetails,
  handleComponentExamples,
  handleGetCodeBlock,
  handleGetComponentFileList,
  handleGetFileCode,
  handleGetFunctionCode,
  readComponentDoc,
} = mod;

// ============ 工具函数 ============

/** 调用 handler 并返回文本长度 */
async function measure(handler, args) {
  const result = await handler(args);
  const text = result.content.map((c) => c.text || '').join('');
  return { chars: text.length, lines: text.split('\n').length, text };
}

/** 格式化数字，千分位 */
function fmt(n) {
  return n.toLocaleString('en-US');
}

/** 计算压缩率 */
function ratio(full, part) {
  if (full === 0) return '—';
  const pct = ((1 - part / full) * 100).toFixed(1);
  return `-${pct}%`;
}

// ============ 测试用例 ============

const COMPONENTS = ['button', 'input', 'modal', 'select', 'tooltip'];

async function run() {
  console.log('# 上下文控量基准测试报告\n');
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`组件数量: ${COMPONENTS.length}\n`);

  // ========== 1. 原始文档 vs MCP 工具 ==========
  console.log('---\n');
  console.log('## 1. component_details 上下文对比\n');
  console.log('对比同一组件在不同查询模式下，AI 实际读到的字符数。\n');
  console.log(
    '| 组件 | 原始 md 全文 | brief 模式 | 压缩率 | sections=props | 压缩率 | propFilter(1个) | 压缩率 |'
  );
  console.log(
    '|------|-------------|-----------|--------|---------------|--------|----------------|--------|'
  );

  const summaryRows = [];

  for (const name of COMPONENTS) {
    // 原始 md 全文
    const rawDoc = readComponentDoc(name);
    const rawChars = rawDoc ? rawDoc.length : 0;

    // brief 模式
    const brief = await measure(handleComponentDetails, {
      componentName: name,
      brief: true,
    });

    // sections=["props"]
    const propsOnly = await measure(handleComponentDetails, {
      componentName: name,
      sections: ['props'],
    });

    // propFilter 取第一个 prop
    // 先从 brief 输出里提取第一个 prop 名
    const propMatch = brief.text.match(/Props 列表.*?:\s*(.+)/);
    const firstProp = propMatch
      ? propMatch[1].split(',')[0].trim()
      : 'onClick';

    const singleProp = await measure(handleComponentDetails, {
      componentName: name,
      sections: ['props'],
      propFilter: [firstProp],
    });

    console.log(
      `| ${name} | ${fmt(rawChars)} | ${fmt(brief.chars)} | ${ratio(rawChars, brief.chars)} | ${fmt(propsOnly.chars)} | ${ratio(rawChars, propsOnly.chars)} | ${fmt(singleProp.chars)} (${firstProp}) | ${ratio(rawChars, singleProp.chars)} |`
    );

    summaryRows.push({ name, rawChars, brief: brief.chars, propsOnly: propsOnly.chars, singleProp: singleProp.chars });
  }

  // 汇总平均
  const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  const avgRaw = avg(summaryRows.map((r) => r.rawChars));
  const avgBrief = avg(summaryRows.map((r) => r.brief));
  const avgProps = avg(summaryRows.map((r) => r.propsOnly));
  const avgSingle = avg(summaryRows.map((r) => r.singleProp));

  console.log(
    `| **平均** | **${fmt(avgRaw)}** | **${fmt(avgBrief)}** | **${ratio(avgRaw, avgBrief)}** | **${fmt(avgProps)}** | **${ratio(avgRaw, avgProps)}** | **${fmt(avgSingle)}** | **${ratio(avgRaw, avgSingle)}** |`
  );

  // ========== 2. sections 各章节对比 ==========
  console.log('\n---\n');
  console.log('## 2. 各章节字符数明细\n');
  console.log(
    '| 组件 | props | events | rules | behavior | when-to-use | accessibility | all |'
  );
  console.log(
    '|------|-------|--------|-------|----------|-------------|---------------|-----|'
  );

  const sectionKeys = ['props', 'events', 'rules', 'behavior', 'when-to-use', 'accessibility'];

  for (const name of COMPONENTS) {
    const cells = [];
    for (const sec of sectionKeys) {
      const r = await measure(handleComponentDetails, {
        componentName: name,
        sections: [sec],
      });
      cells.push(fmt(r.chars));
    }
    const allSec = await measure(handleComponentDetails, {
      componentName: name,
      sections: ['all'],
    });
    cells.push(fmt(allSec.chars));
    console.log(`| ${name} | ${cells.join(' | ')} |`);
  }

  // ========== 3. 源码工具对比 ==========
  console.log('\n---\n');
  console.log('## 3. 源码工具上下文对比\n');
  console.log(
    '| 组件 | 文件列表 | .d.ts 全文 | .js 全文 | .js 折叠后 | 压缩率 | 单函数提取 | 压缩率(vs .js) |'
  );
  console.log(
    '|------|---------|-----------|---------|-----------|--------|-----------|---------------|'
  );

  for (const name of COMPONENTS) {
    // 文件列表
    const fileList = await measure(handleGetComponentFileList, {
      componentName: name,
    });

    // .d.ts
    const dts = await measure(handleGetFileCode, {
      filePath: `@my-design/react/components/${name}/index.d.ts`,
    });

    // .js 完整
    const jsFull = await measure(handleGetFileCode, {
      filePath: `@my-design/react/components/${name}/index.js`,
      fullCode: true,
    });

    // .js 默认（可能折叠）
    const jsDefault = await measure(handleGetFileCode, {
      filePath: `@my-design/react/components/${name}/index.js`,
    });

    // 提取一个函数
    let funcResult = { chars: 0 };
    let funcName = '—';
    try {
      // 从文件列表输出中不好拿函数名，直接尝试常见函数
      const tryFuncs = {
        button: 'Button',
        input: 'Input',
        modal: 'useFocusTrap',
        select: 'filterOptions',
        tooltip: 'getPosition',
      };
      funcName = tryFuncs[name] || name;
      funcResult = await measure(handleGetFunctionCode, {
        filePath: `@my-design/react/components/${name}/index.js`,
        functionName: funcName,
      });
    } catch {
      // ignore
    }

    console.log(
      `| ${name} | ${fmt(fileList.chars)} | ${fmt(dts.chars)} | ${fmt(jsFull.chars)} | ${fmt(jsDefault.chars)} | ${ratio(jsFull.chars, jsDefault.chars)} | ${fmt(funcResult.chars)} (${funcName}) | ${ratio(jsFull.chars, funcResult.chars)} |`
    );
  }

  // ========== 4. 搜索/列表工具 ==========
  console.log('\n---\n');
  console.log('## 4. 搜索与列表工具\n');

  const list = await measure(handleComponentList, {});
  console.log(`- component_list（全部）: ${fmt(list.chars)} 字符`);

  const listForm = await measure(handleComponentList, { category: 'form' });
  console.log(`- component_list（category=form）: ${fmt(listForm.chars)} 字符`);

  const search1 = await measure(handleComponentSearch, { query: '弹窗' });
  console.log(`- component_search("弹窗"): ${fmt(search1.chars)} 字符`);

  const search2 = await measure(handleComponentSearch, { query: 'form' });
  console.log(`- component_search("form"): ${fmt(search2.chars)} 字符`);

  // ========== 5. 总结 ==========
  console.log('\n---\n');
  console.log('## 5. 结论\n');
  console.log(`- brief 模式平均压缩率: ${ratio(avgRaw, avgBrief)}`);
  console.log(`- sections=props 平均压缩率: ${ratio(avgRaw, avgProps)}`);
  console.log(`- propFilter(单属性) 平均压缩率: ${ratio(avgRaw, avgSingle)}`);
  console.log(
    `- AI 渐进式查询（brief → props → 单属性）可将上下文从 ${fmt(avgRaw)} 字符逐步缩减到 ${fmt(avgSingle)} 字符`
  );
}

run().catch((err) => {
  console.error('测试失败:', err);
  process.exit(1);
});
