/**
 * AST 测试用的代码字符串常量
 */

/** 标准函数声明 */
export const FUNCTION_DECLARATION = `
function hello() {
  console.log('hello');
}

function greet(name: string) {
  return \`Hello, \${name}\`;
}
`;

/** 箭头函数（块体） */
export const ARROW_FUNCTION_BLOCK = `
const add = (a: number, b: number) => {
  return a + b;
};

const multiply = (a: number, b: number) => {
  return a * b;
};
`;

/** 箭头函数（表达式体 — 无块体，不会被 findAllFunctions 采集） */
export const ARROW_FUNCTION_EXPRESSION = `
const double = (x: number) => x * 2;
const square = (x: number) => x ** 2;
`;

/** export default 函数声明 */
export const EXPORT_DEFAULT_FUNCTION = `
export default function main() {
  console.log('main');
}
`;

/** class 方法 */
export const CLASS_METHODS = `
class Calculator {
  add(a: number, b: number) {
    return a + b;
  }

  subtract(a: number, b: number) {
    return a - b;
  }
}
`;

/** 对象方法 */
export const OBJECT_METHODS = `
const utils = {
  format(value: string) {
    return value.trim();
  },
  parse(value: string) {
    return JSON.parse(value);
  },
};
`;

/** 泛型 TS 函数 */
export const GENERIC_FUNCTION = `
function identity<T>(value: T): T {
  return value;
}

const mapValues = <K, V>(obj: Record<string, K>, fn: (v: K) => V): Record<string, V> => {
  const result: Record<string, V> = {};
  for (const key in obj) {
    result[key] = fn(obj[key]);
  }
  return result;
};
`;

/** 空文件 */
export const EMPTY_FILE = ``;

/** 语法错误文件 */
export const SYNTAX_ERROR_FILE = `
function broken( {
  console.log('missing paren');
`;

/** 深层嵌套函数 */
export const NESTED_FUNCTIONS = `
function outer() {
  function inner() {
    console.log('inner');
  }
  inner();
}
`;

/** 同名不同作用域 */
export const SAME_NAME_DIFFERENT_SCOPE = `
function process() {
  console.log('top-level');
}

class Handler {
  process() {
    console.log('class method');
  }
}
`;

/** 非函数代码混合 */
export const MIXED_CODE = `
const PI = 3.14159;
const E = 2.71828;

function calculate(radius: number) {
  return PI * radius * radius;
}

type Shape = 'circle' | 'square';
interface Config {
  debug: boolean;
}
`;

/** 匿名函数表达式 */
export const ANONYMOUS_FUNCTIONS = `
const handler = function() {
  console.log('anonymous');
};

setTimeout(function() {
  console.log('callback');
}, 100);
`;
