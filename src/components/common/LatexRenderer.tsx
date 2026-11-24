"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface LatexRendererProps {
  content: string | number | null | undefined;
  className?: string;
  block?: boolean;
}

/**
 * مكون عرض المسائل والمعادلات الرياضية والهندسية بصيغة LaTeX
 * يدعم:
 * 1. الصيغ المضمنة داخل النصوص: $...$ أو \(...\)
 * 2. الصيغ المنفصلة الكبيرة: $$...$$ أو \[...\]
 * 3. صيغ LaTeX الخالصة حتى لو كُتبت بدون علامات الدولار (مثل \frac أو \int أو \sqrt)
 * 4. يضمن اتجاه الكتابة LTR للرموز الرياضية والأرقام حتى داخل النصوص العربية RTL.
 */
export default function LatexRenderer({
  content,
  className = "",
  block = false,
}: LatexRendererProps) {
  if (content === null || content === undefined) return null;
  const text = String(content);

  if (!text.trim()) return null;

  const renderedContent = useMemo(() => {
    // Regex لاكتشاف صيغ اللاتيك:
    // 1. $$...$$
    // 2. \[...\]
    // 3. $...$
    // 4. \(...\)
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;

    // فحص إذا كان النص كله عبارة عن كود LaTeX مباشر بدون علامات الدولار
    const hasLatexCommands = /\\(frac|sqrt|int|sum|prod|lim|alpha|beta|gamma|delta|theta|pi|partial|mathbf|text|times|div|pm|cdot|to|infty|approx|leq|geq|neq|sin|cos|tan|cot|csc|sec|log|ln|matrix|pmatrix|bmatrix|cases)/.test(
      text
    );

    const hasDollarOrBracket =
      text.includes("$") || text.includes("\\[") || text.includes("\\(");

    // إذا كان كود لاتيك خالص بدون $
    if (!hasDollarOrBracket && hasLatexCommands) {
      try {
        const html = katex.renderToString(text.trim(), {
          displayMode: block,
          throwOnError: false,
        });
        return (
          <span
            className={`latex-standalone inline-block ${className}`}
            style={{ direction: "ltr" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return text;
      }
    }

    if (!hasDollarOrBracket) {
      return text;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = regex.lastIndex;

      // النص العادي الذي يسبق المعادلة
      if (matchStart > lastIndex) {
        parts.push(text.slice(lastIndex, matchStart));
      }

      const rawMatch = match[0];
      let mathCode = "";
      let isDisplay = block;

      if (rawMatch.startsWith("$$") && rawMatch.endsWith("$$")) {
        mathCode = rawMatch.slice(2, -2).trim();
        isDisplay = true;
      } else if (rawMatch.startsWith("\\[") && rawMatch.endsWith("\\]")) {
        mathCode = rawMatch.slice(2, -2).trim();
        isDisplay = true;
      } else if (rawMatch.startsWith("$") && rawMatch.endsWith("$")) {
        mathCode = rawMatch.slice(1, -1).trim();
      } else if (rawMatch.startsWith("\\(") && rawMatch.endsWith("\\)")) {
        mathCode = rawMatch.slice(2, -2).trim();
      }

      try {
        const html = katex.renderToString(mathCode, {
          displayMode: isDisplay,
          throwOnError: false,
        });

        parts.push(
          <span
            key={`math-${matchStart}`}
            className={`latex-formula inline-block mx-1 ${
              isDisplay ? "my-2 block text-center" : ""
            }`}
            style={{ direction: "ltr" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        parts.push(rawMatch);
      }

      lastIndex = matchEnd;
    }

    // إضافة بقية النص إن وجد
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  }, [text, block, className]);

  return <span className={`latex-wrapper leading-relaxed ${className}`}>{renderedContent}</span>;
}
