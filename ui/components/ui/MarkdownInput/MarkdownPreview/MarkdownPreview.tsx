import React, { useEffect, useRef, useState } from 'react';
import s from './MarkdownPreview.module.css'
import mermaid from 'mermaid';
import markdownit from 'markdown-it';
import { useDebounce } from 'use-debounce';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import taskLists from './markdown-it-task-list';
import sanitizeHtml, { defaults } from 'sanitize-html';
import { cloneDeep } from 'lodash';

const md = markdownit({
  html: true,
  linkify: true,
  breaks: true,
  xhtmlOut: true,
  highlight: function (str, lang) {
    if (!lang) {
      return '';
    }

    if (hljs.getLanguage(lang)) {
      try {
        return '<pre><code class="hljs">' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>';
      } catch (_) { }
    }

    if (lang.toLowerCase() === 'mermaid') {
      return '<pre class="mermaid">' + str + '</pre>';
    }

    return '';
  }
}).use(taskLists);

var defaultRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  // Add a new `target` attribute, or replace the value of the existing one.
  tokens[idx].attrSet('target', '_blank');

  // Pass the token to the default renderer.
  return defaultRender(tokens, idx, options, env, self);
};

mermaid.initialize({
  startOnLoad: true,
  securityLevel: 'loose',
});

const sanitizeOptions = cloneDeep(defaults);
sanitizeOptions.allowedTags.push('svg', 'symbol', 'img', 'input', 'iframe');
sanitizeOptions.allowedAttributes = Object.assign(sanitizeOptions.allowedAttributes, {
  '*': ['type', 'checked', 'id', 'style', 'class', 'width', 'height', 'viewBox', 'style', 'src', 'srcset', 'alt', 'shape-rendering', 'fill', 'd', 'x', 'y', 'version', 'preserveAspectRatio', 'clip-path', 'clip-rule', 'color', 'stroke', 'color-interpolation', 'cursor', 'display', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'mask', 'opacity', 'pointer-events', 'shape-rendering', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width', 'transform', 'vector-effect', 'visibility'],
});
sanitizeOptions.allowedSchemes.push('data');

export type MarkdownPreviewProps = {
  markdown: string,
  isHidden?: boolean
};

const MarkdownPreview: React.FC<MarkdownPreviewProps> = (props) => {
  const [markdownDebounced] = useDebounce(props.markdown, 350);
  const [renderedMarkdown, setRenderedMarkdown] = useState('');
  const mermaidRerenderTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const safeHtml = sanitizeHtml(md.render(props.markdown), sanitizeOptions);
    setRenderedMarkdown(safeHtml);
  }, [markdownDebounced]);

  useEffect(() => {
    if (mermaidRerenderTimeout.current !== undefined) {
      clearTimeout(mermaidRerenderTimeout.current);
      mermaidRerenderTimeout.current = undefined;
    }

    // XXX - Timeout here is a fix of broken mermaid rendering in case
    // we display the markdown preview component inside a modal dialog.
    mermaidRerenderTimeout.current = setTimeout(() => {
      if (!props.isHidden) { // Fix errors that happen when mermaid container is in DOM, but isn't visible
        mermaid.contentLoaded();
      }
    }, 300);
  }, [renderedMarkdown, props.isHidden]);

  return (
    <div className={s.MarkdownPreview}>
      <div dangerouslySetInnerHTML={{ __html: renderedMarkdown }}></div>
    </div>
  );
}

export default MarkdownPreview;
