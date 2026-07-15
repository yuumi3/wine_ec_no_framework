// フロントエンドの TS/JSX を単一バンドルへ変換するツール設定。
// JSX は React ではなく自作ランタイム(web/src/jsx/runtime)へトランスパイルする。
import esbuild from "esbuild";

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ["web/src/main.tsx"],
  bundle: true,
  outfile: "web/dist/bundle.js",
  format: "esm",
  target: ["es2022"],
  sourcemap: true,
  // React ではなく自作ランタイムへトランスパイルする。
  // classic 変換で h()/Fragment を呼び出し、それらを inject で全ファイルへ自動注入する。
  jsx: "transform",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  inject: ["web/src/jsx/factory.ts"],
  logLevel: "info",
};

const watch = process.argv.includes("--watch");

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("esbuild: watching web/src ...");
} else {
  await esbuild.build(options);
  console.log("esbuild: build complete -> web/dist/bundle.js");
}
