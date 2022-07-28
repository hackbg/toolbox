import{_ as s,c as o,o as a,a as n}from"./app.6fac1cb9.js";const i=JSON.parse('{"title":"@hackbg/konzola ![NPM version](https://www.npmjs.com/package/@hackbg/konzola)","description":"","frontmatter":{},"headers":[],"relativePath":"konzola/README.md"}'),l={name:"konzola/README.md"},p=n(`<h1 id="hackbg-konzola" tabindex="-1"><code>@hackbg/konzola</code> <a href="https://www.npmjs.com/package/@hackbg/konzola" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/npm/v/@hackbg/konzola?color=9013fe&amp;label=" alt="NPM version"></a> <a class="header-anchor" href="#hackbg-konzola" aria-hidden="true">#</a></h1><p><strong>Pretty console output.</strong></p><p>Makes Node&#39;s default plain console output quite a bit easier on the eyes. Best used as a placeholder before introducing proper structured logging.</p><p>Reexports <code>table</code>, <code>colors</code>, <code>propmts</code> and the non-broken version of <code>prettyjson</code></p><div class="language-typescript"><span class="copy"></span><pre><code><span class="line"><span style="color:#89DDFF;font-style:italic;">import</span><span style="color:#A6ACCD;"> Konzola </span><span style="color:#89DDFF;font-style:italic;">from</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">@hackbg/konzola</span><span style="color:#89DDFF;">&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#C792EA;">const</span><span style="color:#A6ACCD;"> console </span><span style="color:#89DDFF;">=</span><span style="color:#A6ACCD;"> </span><span style="color:#82AAFF;">Konzola</span><span style="color:#A6ACCD;">(</span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">some identifying prefix</span><span style="color:#89DDFF;">&#39;</span><span style="color:#A6ACCD;">)</span></span>
<span class="line"></span>
<span class="line"><span style="color:#A6ACCD;">console</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">info</span><span style="color:#A6ACCD;">(</span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">FYI</span><span style="color:#89DDFF;">&#39;</span><span style="color:#A6ACCD;">)</span></span>
<span class="line"><span style="color:#A6ACCD;">console</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">warn</span><span style="color:#A6ACCD;">(</span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">beware!</span><span style="color:#89DDFF;">&#39;</span><span style="color:#A6ACCD;">)</span></span>
<span class="line"><span style="color:#A6ACCD;">console</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">error</span><span style="color:#A6ACCD;">(</span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">oops :(</span><span style="color:#89DDFF;">&#39;</span><span style="color:#A6ACCD;">)</span></span>
<span class="line"><span style="color:#A6ACCD;">console</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">debug</span><span style="color:#A6ACCD;">(</span><span style="color:#89DDFF;">{</span><span style="color:#F07178;">pretty</span><span style="color:#89DDFF;">:</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">printed</span><span style="color:#89DDFF;">&#39;</span><span style="color:#89DDFF;">}</span><span style="color:#A6ACCD;">)</span></span>
<span class="line"><span style="color:#A6ACCD;">console</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">trace</span><span style="color:#A6ACCD;">(</span><span style="color:#89DDFF;">{</span><span style="color:#F07178;">this</span><span style="color:#89DDFF;">:</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">too</span><span style="color:#89DDFF;">&#39;</span><span style="color:#89DDFF;">}</span><span style="color:#A6ACCD;">)</span></span>
<span class="line"><span style="color:#A6ACCD;">console</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">table</span><span style="color:#A6ACCD;">([[</span><span style="color:#F78C6C;">123</span><span style="color:#89DDFF;">,</span><span style="color:#F78C6C;">456</span><span style="color:#A6ACCD;">]</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;">[</span><span style="color:#F78C6C;">789</span><span style="color:#89DDFF;">,</span><span style="color:#F78C6C;">101112</span><span style="color:#A6ACCD;">]])</span></span>
<span class="line"></span></code></pre></div>`,5),e=[p];function t(c,r,D,y,F,A){return a(),o("div",null,e)}var d=s(l,[["render",t]]);export{i as __pageData,d as default};