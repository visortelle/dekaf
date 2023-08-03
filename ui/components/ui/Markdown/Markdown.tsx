import React from "react";
import s from "./Markdown.module.css";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import NothingToShow from "../NothingToShow/NothingToShow";
import * as AppContext from '../../app/contexts/AppContext';

type MarkdownProps = {
  markdown: string;
}

const Markdown: React.FC<MarkdownProps> = (props) => {
  const { markdownSchema } = AppContext.useContext();

  return (
    <div className={s.Markdown}>
      {
        props.markdown ? (
          <ReactMarkdown
            rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSchema]]}
            remarkPlugins={[remarkGfm]}
            children={props.markdown}
          />
        ) : (
          <NothingToShow reason={'no-content-found'}/>
        )
      }
    </div>
  );
}

export default Markdown;
