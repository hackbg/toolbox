import{_ as s,c as a,o as n,d as o}from"./app.a94dd054.js";const A=JSON.parse('{"title":"@hackbg/dock","description":"","frontmatter":{},"headers":[{"level":2,"title":"Example","slug":"example"}],"relativePath":"dock/README.md"}'),e={name:"dock/README.md"},l=o(`<h1 id="hackbg-dock" tabindex="-1">@hackbg/dock <a class="header-anchor" href="#hackbg-dock" aria-hidden="true">#</a></h1><p>Want to run something from Node in a reproducible environment? Use containers.</p><p>This package defines the <code>Dokeres</code>, <code>DokeresImage</code> and <code>DockeresContainer</code> classes.</p><p>Use <code>DockerImage</code> to make sure a specified Docker Image exists on your system, pulling or building it if it&#39;s missing.</p><p>Request the same image to be built multiple times and it&#39;s smart enough to build it only once. This lets you e.g. launch a zillion dockerized tasks in parallel, while being sure that the same Docker image won&#39;t be pulled/built a zillion times.</p><p>Reexports <code>Docker</code> from <code>dockerode</code> for finer control.</p><h2 id="example" tabindex="-1">Example <a class="header-anchor" href="#example" aria-hidden="true">#</a></h2><div class="language-typescript"><button class="copy"></button><span class="lang">typescript</span><pre><code><span class="line"><span style="color:#89DDFF;">await</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">new</span><span style="color:#A6ACCD;"> </span><span style="color:#82AAFF;">Dokeres</span><span style="color:#A6ACCD;">()</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">image</span><span style="color:#A6ACCD;">(</span></span>
<span class="line"><span style="color:#A6ACCD;">  </span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">my-org/my-build-image:v1</span><span style="color:#89DDFF;">&#39;</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#676E95;">// tries to pull this first</span></span>
<span class="line"><span style="color:#A6ACCD;">  </span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">/path/to/my/Dockerfile</span><span style="color:#89DDFF;">&#39;</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;">   </span><span style="color:#676E95;">// builds from this manifest if pull fails</span></span>
<span class="line"><span style="color:#A6ACCD;">)</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">run</span><span style="color:#A6ACCD;">(                                              </span><span style="color:#676E95;">// docker run                           \\</span></span>
<span class="line"><span style="color:#A6ACCD;">  </span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">build-my-thing</span><span style="color:#89DDFF;">&#39;</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">{</span><span style="color:#A6ACCD;">                               </span><span style="color:#676E95;">//   --name build-my-thing              \\</span></span>
<span class="line"><span style="color:#A6ACCD;">     </span><span style="color:#F07178;">readonly</span><span style="color:#89DDFF;">:</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">{</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&#39;</span><span style="color:#F07178;">/my/project/sources</span><span style="color:#89DDFF;">&#39;</span><span style="color:#89DDFF;">:</span><span style="color:#A6ACCD;">   </span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">/src</span><span style="color:#89DDFF;">&#39;</span><span style="color:#A6ACCD;">  </span><span style="color:#89DDFF;">}</span><span style="color:#A6ACCD;"> </span><span style="color:#676E95;">//   -v /my/project/sources:/sources:ro \\</span></span>
<span class="line"><span style="color:#A6ACCD;">     writable: </span><span style="color:#89DDFF;">{</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&#39;</span><span style="color:#F07178;">/my/project/artifacts</span><span style="color:#89DDFF;">&#39;</span><span style="color:#89DDFF;">:</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">/dist</span><span style="color:#89DDFF;">&#39;</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">}</span><span style="color:#A6ACCD;"> </span><span style="color:#676E95;">//   -v /my/project/sources:/sources:rw \\</span></span>
<span class="line"><span style="color:#A6ACCD;">  </span><span style="color:#89DDFF;">}</span><span style="color:#A6ACCD;">                                                 </span><span style="color:#676E95;">//   my-org/my-build-image:v1</span></span>
<span class="line"><span style="color:#A6ACCD;">)</span></span>
<span class="line"></span></code></pre></div><div align="center"><hr><p>Made with #$%&amp; @ <a href="https://foss.hack.bg" target="_blank" rel="noreferrer"><strong>Hack.bg</strong></a></p></div>`,9),p=[l];function t(r,c,D,i,y,d){return n(),a("div",null,p)}const C=s(e,[["render",t]]);export{A as __pageData,C as default};
