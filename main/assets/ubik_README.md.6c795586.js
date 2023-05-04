import{_ as s,c as e,o as a,d as o}from"./app.d52f45e7.js";const F=JSON.parse('{"title":"@hackbg/ubik","description":"","frontmatter":{},"headers":[{"level":2,"title":"Setup","slug":"setup"},{"level":2,"title":"Usage","slug":"usage"},{"level":2,"title":"Features","slug":"features"}],"relativePath":"ubik/README.md"}'),n={name:"ubik/README.md"},l=o(`<div style="text-align:center;"><h1 id="hackbg-ubik" tabindex="-1">@hackbg/ubik <a class="header-anchor" href="#hackbg-ubik" aria-hidden="true">#</a></h1><p>Opinionated shim for publishing isomorphic TypeScript libraries to NPM, in response to the current multilevel fragmentation of the JS packaging landscape.</p></div><hr><h2 id="setup" tabindex="-1">Setup <a class="header-anchor" href="#setup" aria-hidden="true">#</a></h2><ul><li>Add to your <code>package.json</code>:</li></ul><div class="language-json"><button class="copy"></button><span class="lang">json</span><pre><code><span class="line"><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">  </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C792EA;">devDependencies</span><span style="color:#89DDFF;">&quot;</span><span style="color:#89DDFF;">:</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">    </span><span style="color:#89DDFF;">&quot;</span><span style="color:#FFCB6B;">@hackbg/ubik</span><span style="color:#89DDFF;">&quot;</span><span style="color:#89DDFF;">:</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C3E88D;">latest</span><span style="color:#89DDFF;">&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">  </span><span style="color:#89DDFF;">},</span></span>
<span class="line"><span style="color:#A6ACCD;">  </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C792EA;">scripts</span><span style="color:#89DDFF;">&quot;</span><span style="color:#89DDFF;">:</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">    </span><span style="color:#89DDFF;">&quot;</span><span style="color:#FFCB6B;">ubik</span><span style="color:#89DDFF;">&quot;</span><span style="color:#89DDFF;">:</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C3E88D;">ubik</span><span style="color:#89DDFF;">&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">  </span><span style="color:#89DDFF;">}</span></span>
<span class="line"><span style="color:#89DDFF;">}</span></span>
<span class="line"></span></code></pre></div><h2 id="usage" tabindex="-1">Usage <a class="header-anchor" href="#usage" aria-hidden="true">#</a></h2><ul><li>Edit package, increment version in package.json, commit</li><li>Test if your package can be released: <code>pnpm ubik dry</code></li><li>Release into the wild: <code>pnpm ubik wet</code></li></ul><p>If publishing to tarball, use <code>pnpm ubik fix</code> in your CI.</p><h2 id="features" tabindex="-1">Features <a class="header-anchor" href="#features" aria-hidden="true">#</a></h2><ul><li><p>Does not remove sources from distribution.</p></li><li><p>Does not compact all compiled code into a single file.</p></li><li><p>Compiles TypeScript to both CommonJS and ESM targets.</p><ul><li>Does not put the compilation output in a subdir.</li><li>Intelligently decides whether <code>.dist.js</code> will contain CJS or ESM depending on <code>type</code> in <code>package.json</code>, and uses <code>.cjs</code> or <code>.mjs</code> for the other version.</li><li>Patches extensions to make the ESM build work in Node 16+.</li></ul></li><li><p>Publishes to NPM.</p><ul><li>Modifies <code>package.json</code> during publication to point to the correct compile output for each mode.</li><li>Backs up the original in <code>package.json.real</code> and restores it after publishing the package.</li></ul></li><li><p>Adds a Git tag in the format <code>npm/$PACKAGE/$VERSION</code> and pushes it.</p></li></ul><div align="center"><hr><p>Made with <strong>#%&amp;!</strong> @ <a href="https://foss.hack.bg" target="_blank" rel="noreferrer"><strong>Hack.bg</strong></a> in response to the Node16/TS4 incompatibility event of Q2 2022.</p></div>`,11),t=[l];function p(i,c,r,d,u,D){return a(),e("div",null,t)}const y=s(n,[["render",p]]);export{F as __pageData,y as default};