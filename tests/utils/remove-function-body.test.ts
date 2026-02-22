import { describe, it, expect } from '@rstest/core';
import { findAllFunctions, removeFunctionBodies, extractFunction, getFunctionNames } from '../../src/utils/remove-function-body';
import {
  FUNCTION_DECLARATION,
  ARROW_FUNCTION_BLOCK,
  ARROW_FUNCTION_EXPRESSION,
  EXPORT_DEFAULT_FUNCTION,
  CLASS_METHODS,
  OBJECT_METHODS,
  GENERIC_FUNCTION,
  EMPTY_FILE,
  SYNTAX_ERROR_FILE,
  NESTED_FUNCTIONS,
  SAME_NAME_DIFFERENT_SCOPE,
  MIXED_CODE,
  ANONYMOUS_FUNCTIONS,
} from '../fixtures/code-samples';

// ========================
// findAllFunctions
// ========================
describe('findAllFunctions', () => {
  it('应解析标准函数声明', () => {
    const fns = findAllFunctions(FUNCTION_DECLARATION);
    const names = fns.map(f => f.name);
    expect(names).toContain('hello');
    expect(names).toContain('greet');
  });

  it('应解析箭头函数（块体）', () => {
    const fns = findAllFunctions(ARROW_FUNCTION_BLOCK);
    const names = fns.map(f => f.name);
    expect(names).toContain('add');
    expect(names).toContain('multiply');
  });

  it('箭头函数（表达式体）无块体，不产生函数记录', () => {
    const fns = findAllFunctions(ARROW_FUNCTION_EXPRESSION);
    // 表达式体箭头函数没有 BlockStatement body，不会被采集
    expect(fns.length).toBe(0);
  });

  it('应解析 export default 函数', () => {
    const fns = findAllFunctions(EXPORT_DEFAULT_FUNCTION);
    const names = fns.map(f => f.name);
    expect(names).toContain('main');
  });

  it('应解析 class 方法', () => {
    const fns = findAllFunctions(CLASS_METHODS);
    const names = fns.map(f => f.name);
    expect(names).toContain('add');
    expect(names).toContain('subtract');
  });

  it('应解析对象方法', () => {
    const fns = findAllFunctions(OBJECT_METHODS);
    const names = fns.map(f => f.name);
    expect(names).toContain('format');
    expect(names).toContain('parse');
  });

  it('应解析泛型 TS 函数', () => {
    const fns = findAllFunctions(GENERIC_FUNCTION);
    const names = fns.map(f => f.name);
    expect(names).toContain('identity');
    expect(names).toContain('mapValues');
  });

  it('空文件返回空数组', () => {
    const fns = findAllFunctions(EMPTY_FILE);
    expect(fns).toEqual([]);
  });

  it('语法错误文件不崩溃，返回空数组或部分结果', () => {
    const fns = findAllFunctions(SYNTAX_ERROR_FILE);
    // 不应抛出异常，返回数组即可
    expect(Array.isArray(fns)).toBe(true);
  });

  it('应解析深层嵌套函数', () => {
    const fns = findAllFunctions(NESTED_FUNCTIONS);
    const names = fns.map(f => f.name);
    expect(names).toContain('outer');
    expect(names).toContain('inner');
  });

  it('应解析同名不同作用域的函数', () => {
    const fns = findAllFunctions(SAME_NAME_DIFFERENT_SCOPE);
    const processCount = fns.filter(f => f.name === 'process').length;
    expect(processCount).toBe(2);
  });
});

// ========================
// removeFunctionBodies
// ========================
describe('removeFunctionBodies', () => {
  it('应将函数体替换为 { ... }', () => {
    const result = removeFunctionBodies(FUNCTION_DECLARATION);
    expect(result).toContain('function hello()');
    expect(result).toContain('{ ... }');
    expect(result).not.toContain("console.log('hello')");
  });

  it('应保留非函数代码', () => {
    const result = removeFunctionBodies(MIXED_CODE);
    expect(result).toContain('const PI = 3.14159');
    expect(result).toContain('const E = 2.71828');
    expect(result).toContain("type Shape = 'circle' | 'square'");
    expect(result).toContain('function calculate');
    expect(result).toContain('{ ... }');
  });

  it('嵌套函数只替换外层', () => {
    const result = removeFunctionBodies(NESTED_FUNCTIONS);
    // outer 的体被替换为 { ... }，inner 在里面所以也消失了
    expect(result).toContain('function outer()');
    expect(result).toContain('{ ... }');
    // inner 函数的声明不应该出现在结果中（因为它在 outer 函数体内部）
    expect(result).not.toContain('function inner()');
  });

  it('空文件返回空字符串', () => {
    const result = removeFunctionBodies(EMPTY_FILE);
    expect(result).toBe('');
  });
});

// ========================
// extractFunction
// ========================
describe('extractFunction', () => {
  it('应按名称提取函数', () => {
    const code = extractFunction(FUNCTION_DECLARATION, 'hello');
    expect(code).not.toBeNull();
    expect(code).toContain('function hello()');
    expect(code).toContain("console.log('hello')");
  });

  it('不存在的函数名返回 null', () => {
    const code = extractFunction(FUNCTION_DECLARATION, 'nonexistent');
    expect(code).toBeNull();
  });
});

// ========================
// getFunctionNames
// ========================
describe('getFunctionNames', () => {
  it('应返回去重的函数名列表', () => {
    const names = getFunctionNames(SAME_NAME_DIFFERENT_SCOPE);
    // 虽然有两个 process，去重后应该只有一个
    const processCount = names.filter(n => n === 'process').length;
    expect(processCount).toBe(1);
  });

  it('应排除匿名函数', () => {
    const names = getFunctionNames(ANONYMOUS_FUNCTIONS);
    expect(names).not.toContain('<anonymous>');
  });
});
