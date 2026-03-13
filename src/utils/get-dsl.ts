/**
 * getDSL - 设计稿下载函数
 *
 * 通过 fileKey 下载设计稿并保存到指定路径，返回文件内容文本。
 *
 * 上线时直接替换 getDSL 函数体为实际实现即可。
 */

export interface GetDSLParams {
  /** 设计稿 fileKey，如 "9E5B01GS_546" */
  code: string;
  /** 保存的目标文件路径 */
  filePath: string;
}

export type GetDSLFn = (params: GetDSLParams) => Promise<string>;

let _testOverride: GetDSLFn | undefined;

/** 测试用：覆盖 getDSL 实现 */
export function registerGetDSL(fn: GetDSLFn): void {
  _testOverride = fn;
}

/**
 * 通过 fileKey 下载设计稿到指定路径，返回文件内容
 *
 * 上线时把函数体里的 throw 替换为实际实现即可，例如：
 * ```ts
 * const text = await externalGetDSL({ code: params.code, filePath: params.filePath });
 * return text;
 * ```
 */
export async function getDSL(params: GetDSLParams): Promise<string> {
  if (_testOverride) return _testOverride(params);

  // ========== 替换为实际实现 ==========
  const { code, filePath } = params;
  void code;
  void filePath;
  throw new Error('getDSL 未实现，请替换此函数体');
}
