import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders a chunk of the study material (bold/italic/bullets/sub-headers) as styled HTML.
// Wrap in a Tailwind `prose` container to get readable typography.
export default function Markdown({ children }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>;
}
