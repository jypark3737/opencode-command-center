export function rewriteHtml(html: string, prefix: string): string {
  // Rewrite absolute paths to go through tunnel prefix
  let rewritten = html
    .replace(/\ssrc="\//g, ` src="${prefix}/`)
    .replace(/\ssrc='\//g, ` src='${prefix}/`)
    .replace(/\shref="\//g, ` href="${prefix}/`)
    .replace(/\shref='\//g, ` href='${prefix}/`)
    .replace(/url\("\//g, `url("${prefix}/`)
    .replace(/url\('\//g, `url('${prefix}/`);

  // Inject fetch/XHR patcher before first <script tag
  const patcherScript = `<script>
(function(){
  var B="${prefix}";
  var origFetch=window.fetch;
  window.fetch=function(u,o){
    if(typeof u==='string'&&u.startsWith('/')&&!u.startsWith(B))u=B+u;
    else if(u instanceof Request&&u.url.startsWith('/')&&!u.url.startsWith(B)){
      u=new Request(B+u.url,u);
    }
    return origFetch.call(this,u,o);
  };
  var origXHROpen=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(m,u){
    if(typeof u==='string'&&u.startsWith('/')&&!u.startsWith(B))arguments[1]=B+u;
    return origXHROpen.apply(this,arguments);
  };
  // Patch EventSource for SSE
  if(window.EventSource){
    var origES=window.EventSource;
    window.EventSource=function(u,o){
      if(typeof u==='string'&&u.startsWith('/')&&!u.startsWith(B))u=B+u;
      return new origES(u,o);
    };
    window.EventSource.prototype=origES.prototype;
    window.EventSource.CONNECTING=origES.CONNECTING;
    window.EventSource.OPEN=origES.OPEN;
    window.EventSource.CLOSED=origES.CLOSED;
  }
})();
</script>`;

  // Insert patcher before first <script
  const scriptIdx = rewritten.indexOf("<script");
  if (scriptIdx !== -1) {
    rewritten =
      rewritten.slice(0, scriptIdx) + patcherScript + rewritten.slice(scriptIdx);
  } else {
    // Fallback: append before </body>
    const bodyIdx = rewritten.indexOf("</body>");
    if (bodyIdx !== -1) {
      rewritten =
        rewritten.slice(0, bodyIdx) + patcherScript + rewritten.slice(bodyIdx);
    } else {
      rewritten += patcherScript;
    }
  }

  return rewritten;
}
